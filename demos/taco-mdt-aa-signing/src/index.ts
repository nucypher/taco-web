#!/usr/bin/env node

import {
  Implementation,
  toMetaMaskSmartAccount,
} from '@metamask/delegation-toolkit';
import {
  SigningCoordinatorAgent,
} from '@nucypher/shared';
import { conditions, domains, initialize, signUserOp, UserOperationToSign } from '@nucypher/taco';
import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
import {
  Address,
  createPublicClient,
  http,
  parseEther,
  PublicClient,
} from 'viem';
import {
  createBundlerClient,
  createPaymasterClient,
} from 'viem/account-abstraction';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import { createViemTacoAccount } from './taco-account';

dotenv.config();

const SEPOLIA_CHAIN_ID = 11155111;
const TACO_DOMAIN = domains.DEVNET;
const COHORT_ID = 1;
const COHORT_MULTISIG_ADDRESS = '0xDdBb4c470C7BFFC97345A403aC7FcA77844681D9';
const AA_VERSION = 'mdt';

async function createTacoSmartAccount(
  publicClient: PublicClient,
  provider: ethers.providers.JsonRpcProvider,
) {
  await initialize();
  
  const participants = await SigningCoordinatorAgent.getParticipants(
    provider,
    TACO_DOMAIN,
    COHORT_ID,
  );
  const threshold = await SigningCoordinatorAgent.getThreshold(
    provider,
    TACO_DOMAIN,
    COHORT_ID,
  );
  const signers = participants.map((p) => p.signerAddress as Address);

  // Create a TACo account using the cohort's multisig address
  // This satisfies MetaMask's signatory requirement and uses the proper cohort multisig
  const tacoAccount = createViemTacoAccount(COHORT_MULTISIG_ADDRESS as Address);
  console.log(`🎯 Using cohort multisig: ${COHORT_MULTISIG_ADDRESS}`);

  const smartAccount = await toMetaMaskSmartAccount({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: publicClient as any, // Required due to viem/delegation-toolkit type incompatibilities
    implementation: Implementation.MultiSig,
    deployParams: [signers, BigInt(threshold)],
    deploySalt: '0x' as `0x${string}`,
    signatory: [{ account: tacoAccount }],
  });

  return { smartAccount, threshold };
}

async function signUserOpWithTaco(
  userOp: Record<string, unknown>,
  provider: ethers.providers.JsonRpcProvider,
) {
  const signingContext =
    await conditions.context.ConditionContext.forSigningCohort(
      provider,
      TACO_DOMAIN,
      COHORT_ID,
      SEPOLIA_CHAIN_ID,
    );

  return await signUserOp(
    provider,
    TACO_DOMAIN,
    COHORT_ID,
    SEPOLIA_CHAIN_ID,
    userOp as UserOperationToSign,
    AA_VERSION,
    signingContext,
  );
}

async function logBalances(
  provider: ethers.providers.JsonRpcProvider,
  eoaAddress: string,
  smartAccountAddress: string,
) {
  const eoaBalance = await provider.getBalance(eoaAddress);
  const smartAccountBalance = await provider.getBalance(smartAccountAddress);
  console.log(`\n💳 EOA Balance: ${ethers.utils.formatEther(eoaBalance)} ETH`);
  console.log(
    `🏦 Smart Account: ${ethers.utils.formatEther(smartAccountBalance)} ETH\n`,
  );
}

async function main() {
  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL!);
    const localAccount = privateKeyToAccount(
      process.env.PRIVATE_KEY as `0x${string}`,
    );
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(process.env.RPC_URL),
    });

    const paymasterClient = createPaymasterClient({
      transport: http(process.env.BUNDLER_URL),
    });
    const bundlerClient = createBundlerClient({
      transport: http(process.env.BUNDLER_URL),
      paymaster: paymasterClient,
      chain: sepolia,
    });

    const fee = {
      maxFeePerGas: parseEther('0.00001'),
      maxPriorityFeePerGas: parseEther('0.000001'),
    };

    console.log('🔧 Creating TACo smart account...\n');
    const { smartAccount, threshold } = await createTacoSmartAccount(
      publicClient,
      provider,
    );
    console.log(`✅ Smart account created: ${smartAccount.address}`);
    console.log(`🔐 Threshold: ${threshold} signatures required\n`);

    await logBalances(provider, localAccount.address, smartAccount.address);

    const smartAccountBalance = await provider.getBalance(smartAccount.address);
    if (smartAccountBalance.lt(ethers.utils.parseEther('0.01'))) {
      console.log('💰 Funding smart account...');
      const eoaWallet = new ethers.Wallet(
        process.env.PRIVATE_KEY as string,
        provider,
      );
      const fundTx = await eoaWallet.sendTransaction({
        to: smartAccount.address,
        value: ethers.utils.parseEther('0.001'),
      });
      await fundTx.wait();
      console.log(`✅ Funded successfully!\n🔗 Tx: ${fundTx.hash}`);
      await logBalances(provider, localAccount.address, smartAccount.address);
    }

    const currentBalance = await provider.getBalance(smartAccount.address);
    const gasReserve = ethers.utils.parseEther('0.0005');
    const transferAmount = currentBalance.gt(gasReserve)
      ? currentBalance.sub(gasReserve)
      : parseEther('0.0001');

    console.log('📝 Preparing transaction...');
    const userOp = await bundlerClient.prepareUserOperation({
      account: smartAccount,
      calls: [
        {
          target: localAccount.address as Address,
          value: BigInt(transferAmount.toString()),
          data: '0x' as `0x${string}`,
        },
      ],
      ...fee,
      verificationGasLimit: BigInt(500_000),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any); // Required due to viem/delegation-toolkit type incompatibilities
    console.log(
      `💸 Transfer amount: ${ethers.utils.formatEther(transferAmount)} ETH\n`,
    );

    console.log('🔏 Signing with TACo...');
    // since the provider for this demo is already for sepolia, we can reuse it here
    const signature = await signUserOpWithTaco(userOp, provider);
    console.log(`✅ Signature collected: ${signature.aggregatedSignature}\n`);

    console.log('🚀 Executing transaction...');
    const userOpHash = await bundlerClient.sendUserOperation({
      ...userOp,
      signature: signature.aggregatedSignature as `0x${string}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any); // Required due to viem/delegation-toolkit type incompatibilities
    console.log(`📝 UserOp Hash: ${userOpHash}`);

    const { receipt } = await bundlerClient.waitForUserOperationReceipt({
      hash: userOpHash,
    });
    console.log(`\n🎉 Transaction successful!`);
    console.log(`🔗 Tx: ${receipt.transactionHash}`);
    console.log(
      `🌐 View on Etherscan: https://sepolia.etherscan.io/tx/${receipt.transactionHash}\n`,
    );

    await logBalances(provider, localAccount.address, smartAccount.address);
    console.log('✨ Demo completed successfully! ✨');
    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Demo failed: ${errorMessage}`);
    process.exit(1);
  }
}

if (require.main === module) {
  // Check if --dry-run flag is present (used for CI syntax checking)
  if (process.argv.includes('--dry-run')) {
    console.log('✓ Syntax check passed');
    process.exit(0);
  }
  main();
}
