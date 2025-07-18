import {
  Domain,
  fromHexString,
  getPorterUris,
  SigningCoordinatorAgent,
  UserOperation,
} from '@nucypher/shared';
import { ethers } from 'ethers';
import { beforeAll, describe, expect, test } from 'vitest';

import { initialize } from '../src';
import { context } from '../src/conditions';
import { signUserOp } from '../src/sign';

const RPC_PROVIDER_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
const DUMMY_ADDRESS = '0x742D35Cc6634C0532925A3b8D33c9c0E7B66C8E8';
const DOMAIN = 'lynx';
const COHORT_ID = 1;
const CHAIN_ID = 11155111;

// skip integration test if RUNNING_IN_CI is not set (it is set in CI environments)
describe.skipIf(!process.env.RUNNING_IN_CI)(
  'TACo Sign Integration Test',
  () => {
    let provider: ethers.providers.JsonRpcProvider;

    beforeAll(async () => {
      provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDER_URL);

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
        sender: DUMMY_ADDRESS,
        nonce: 0,
        factory: '0x',
        factoryData: '0x',
        callData: '0x',
        callGasLimit: 0,
        verificationGasLimit: 0,
        preVerificationGas: 0,
        maxFeePerGas: 0,
        maxPriorityFeePerGas: 0,
        paymaster: '0x',
        paymasterVerificationGasLimit: 0,
        paymasterPostOpGasLimit: 0,
        paymasterData: '0x',
        signature: '0x',
      };

      // Get porter URIs
      const porterUris = await getPorterUris(DOMAIN as Domain);

      // Get context
      const signingContext = await context.ConditionContext.forSigningCohort(
        provider,
        DOMAIN as Domain,
        COHORT_ID,
        CHAIN_ID,
      );

      // Sign user operation
      const signResult = await signUserOp(
        provider,
        DOMAIN as Domain,
        COHORT_ID,
        CHAIN_ID,
        userOp,
        '0.8.0',
        signingContext,
        porterUris,
      );

      const threshold = await SigningCoordinatorAgent.getThreshold(
        provider,
        DOMAIN as Domain,
        COHORT_ID,
      );

      // Verify sign result
      expect(signResult).toBeDefined();
      expect(signResult.messageHash).toBeDefined();
      expect(signResult.aggregatedSignature).toBeDefined();
      expect(fromHexString(signResult.aggregatedSignature!).length).toEqual(
        threshold * 65, // Each signature is 65 bytes (32 bytes r, 32 bytes s, 1 byte v)
      );
      expect(signResult.signingResults).toBeDefined();
      expect(Object.keys(signResult.signingResults).length).toBeGreaterThan(0);
    }, 15000);
  },
);
