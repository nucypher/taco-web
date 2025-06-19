import { Domain, getPorterUris } from '@nucypher/shared';
import { ethers } from 'ethers';
import { beforeAll, describe, expect, test } from 'vitest';

import { initialize } from '../src';
import { signUserOp } from '../src/sign';
import { UserOperation } from '../src/types';

const RPC_PROVIDER_URL = 'https://rpc-amoy.polygon.technology';
const SIGNER_PRIVATE_KEY = '0x900edb9e8214b2353f82aa195e915128f419a92cfb8bbc0f4784f10ef4112b86';
const DOMAIN = 'lynx';
const RITUAL_ID = 27;
const CHAIN_ID = 80002;

describe('Taco Sign Integration Test', () => {
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

  test.skip('should sign a user operation', async () => {
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
      userOp,
      CHAIN_ID,
      'zerodev:v0.6',
      RITUAL_ID,
      DOMAIN as Domain,
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
  }, 15000);
}); 