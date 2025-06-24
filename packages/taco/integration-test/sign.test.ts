import { Domain, getPorterUris, UserOperation } from '@nucypher/shared';
import { ethers } from 'ethers';
import { beforeAll, describe, expect, test } from 'vitest';

import { initialize } from '../src';
import { signUserOp } from '../src/sign';

const RPC_PROVIDER_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const SIGNER_PRIVATE_KEY = '0x900edb9e8214b2353f82aa195e915128f419a92cfb8bbc0f4784f10ef4112b86';
const DOMAIN = 'lynx';
const RITUAL_ID = 2;
const CHAIN_ID = 11155111;

describe.skipIf(!process.env.RUNNING_IN_CI)('Taco Sign Integration Test', () => {
  let provider: ethers.providers.JsonRpcProvider;
  let signer: ethers.Wallet;

  beforeAll(async () => {
    provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDER_URL);
    signer = new ethers.Wallet(SIGNER_PRIVATE_KEY, provider);

    // Initialize the library
    await initialize();

    // Verify network connection
    const network = await provider.getNetwork();
    if (network.chainId !== CHAIN_ID) {
      throw new Error(
        `Provider connected to wrong network. Expected ${CHAIN_ID}, got ${network.chainId}`,
      );
    }
  });

  test('should sign a user operation', async () => {
    // Create a sample user operation with all required fields
    const userOp: UserOperation = {
      sender: signer.address,
      nonce: '0x0',
      factory: '0x',
      factoryData: '0x',
      callData: '0x',
      callGasLimit: '0x0',
      verificationGasLimit: '0x0',
      preVerificationGas: '0x0',
      maxFeePerGas: '0x0',
      maxPriorityFeePerGas: '0x0',
      paymaster: '0x',
      paymasterVerificationGasLimit: '0x0',
      paymasterPostOpGasLimit: '0x0',
      paymasterData: '0x',
      signature: '0x'
    };

    // Get porter URIs
    const porterUris = await getPorterUris(DOMAIN as Domain);

    // Sign user operation
    const signResult = await signUserOp(
      provider,
      DOMAIN as Domain,
      RITUAL_ID,
      CHAIN_ID,
      userOp,
      '0.8.0',
      { optimistic: true, returnAggregated: true },
      undefined,
      porterUris
    );

    // Verify sign result
    expect(signResult).toBeDefined();
    expect(signResult.digest).toBeDefined();
    expect(signResult.aggregatedSignature).toBeDefined();
    expect(signResult.signingResults).toBeDefined();
    expect(Object.keys(signResult.signingResults).length).toBeGreaterThan(0);
  }, 150000);
}); 