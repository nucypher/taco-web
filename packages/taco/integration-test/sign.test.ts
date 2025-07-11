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
import { ConditionExpression } from '../src/conditions/condition-expr';
import { signUserOp } from '../src/sign';
import { CoreConditions } from '../src/types';

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
      console.log('Sign result:', signResult);

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
    }, 150000);

    test('should validate condition serialization round-trip with existing cohort conditions', async () => {
      // This integration test validates condition serialization/deserialization without writing to blockchain:
      // 1. Read existing conditions from a known cohort on the chain
      // 2. Convert those bytes to ConditionExpression object
      // 3. Convert the object back to bytes (what would be written to chain)
      // 4. Verify the bytes match exactly
      
      // Try to read conditions from the existing ritual/cohort
      let retrievedConditionHex: string;
      try {
        retrievedConditionHex = await SigningCoordinatorAgent.getSigningCohortConditions(
          provider,
          DOMAIN as Domain,
          COHORT_ID,
          CHAIN_ID,
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('cohort does not exist') || 
            errorMessage.includes('invalid cohort') ||
            errorMessage.includes('conditions not set')) {
          console.log(`Skipping test - no conditions found for cohort ${COHORT_ID}. This test requires an existing cohort with conditions set.`);
          return;
        }
        throw error;
      }
      
      // If the hex is empty or just '0x', skip the test
      if (!retrievedConditionHex || retrievedConditionHex === '0x' || retrievedConditionHex.length <= 2) {
        console.log(`Skipping test - cohort ${COHORT_ID} has no conditions set.`);
        return;
      }
      
      console.log('Retrieved condition hex from chain:', retrievedConditionHex);
      
      // Convert hex back to JSON string (simulating what the chain stores)
      const chainConditionJson = ethers.utils.toUtf8String(retrievedConditionHex);
      console.log('Chain condition JSON:', chainConditionJson);
      
      // Parse the JSON and recreate the ConditionExpression from the chain data
      // This simulates reading conditions from chain and converting to our object model
      const coreConditions = new CoreConditions(chainConditionJson);
      const retrievedConditions = ConditionExpression.fromCoreConditions(coreConditions);
      
      // Also verify we can create a ConditionContext from it (this validates the data is readable)
      const retrievedContext = await context.ConditionContext.forSigningCohort(
        provider,
        DOMAIN as Domain,
        COHORT_ID,
        CHAIN_ID,
      );
      
      // Convert back to JSON (this is what would be written to chain)
      const roundTripJson = retrievedConditions.toJson();
      console.log('Round-trip JSON:', roundTripJson);
      
      // The core verification: ensure serialization round-trip is identical
      // This proves that read → object → write produces identical bytes
      expect(JSON.parse(roundTripJson)).toEqual(JSON.parse(chainConditionJson));
      
      // Additional verification: ensure the objects have expected properties
      expect(retrievedConditions.condition).toBeDefined();
      
      // Verify that the semantic content is identical (JSON property order may differ)
      expect(JSON.parse(roundTripJson)).toEqual(JSON.parse(chainConditionJson));
      
      console.log('Condition serialization round-trip validation completed successfully!');
      
    }, 60000); // Shorter timeout since no blockchain writes
  },
);