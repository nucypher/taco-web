import { beforeAll, describe, expect, test } from 'vitest';

import { fromBytes, toBytes } from '@nucypher/shared';
import {
  USER_ADDRESS_PARAM_DEFAULT,
  ViemEIP4361AuthProvider,
} from '@nucypher/taco-auth';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';
import { conditions, initialize, ThresholdMessageKit } from '../src';
import { CompoundCondition } from '../src/conditions/compound-condition';
import { decryptWithViem, encryptWithViem } from '../src/viem-taco';
import { UINT256_MAX } from '../test/test-utils';

const RPC_PROVIDER_URL = 'https://rpc-amoy.polygon.technology';
const ENCRYPTOR_PRIVATE_KEY =
  '0x900edb9e8214b2353f82aa195e915128f419a92cfb8bbc0f4784f10ef4112b86';
const CONSUMER_PRIVATE_KEY =
  '0xf307e165339cb5deb2b8ec59c31a5c0a957b8e8453ce7fe8a19d9a4c8acf36d4';
const DOMAIN = 'lynx';
const RITUAL_ID = 27;
const CHAIN_ID = 80002;

// Create viem accounts from private keys
const encryptorAccount = privateKeyToAccount(
  ENCRYPTOR_PRIVATE_KEY as `0x${string}`,
);
const consumerAccount = privateKeyToAccount(
  CONSUMER_PRIVATE_KEY as `0x${string}`,
);

describe.skipIf(!process.env.RUNNING_IN_CI)(
  'Viem Encrypt/Decrypt Integration Test',
  () => {
    let viemPublicClient: any;
    let viemWalletClient: any;

    beforeAll(async () => {
      // Create viem clients
      viemPublicClient = createPublicClient({
        chain: polygonAmoy,
        transport: http(RPC_PROVIDER_URL),
      });

      viemWalletClient = createWalletClient({
        account: consumerAccount,
        chain: polygonAmoy,
        transport: http(RPC_PROVIDER_URL),
      });

      // Initialize the library
      await initialize();

      // Verify network connection
      const chainId = await viemPublicClient.getChainId();
      if (chainId !== CHAIN_ID) {
        throw new Error(
          `Provider connected to wrong network. Expected ${CHAIN_ID}, got ${chainId}`,
        );
      }
    });

    test('should encrypt and decrypt a message with viem using RPC balance condition', async () => {
      // Create test message
      const messageString = 'This is a secret viem message 🔐';
      const message = toBytes(messageString);

      // Create conditions
      const hasPositiveBalance = new conditions.base.rpc.RpcCondition({
        chain: CHAIN_ID,
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: {
          comparator: '>=',
          value: 0,
        },
      });

      const balanceLessThanMaxUintBigInt = new conditions.base.rpc.RpcCondition(
        {
          chain: CHAIN_ID,
          method: 'eth_getBalance',
          parameters: [':userAddress', 'latest'],
          returnValueTest: {
            comparator: '<',
            // max uint256
            value: UINT256_MAX,
          },
        },
      );

      const compoundCondition = CompoundCondition.and([
        hasPositiveBalance,
        balanceLessThanMaxUintBigInt,
      ]);

      // Encrypt message using viem
      const messageKit = await encryptWithViem(
        viemPublicClient,
        DOMAIN,
        message,
        compoundCondition,
        RITUAL_ID,
        encryptorAccount,
      );

      const encryptedBytes = messageKit.toBytes();

      // Prepare for decryption
      const messageKitFromBytes = ThresholdMessageKit.fromBytes(encryptedBytes);
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKitFromBytes);

      // Add auth provider using viem-native auth provider
      if (
        conditionContext.requestedContextParameters.has(
          USER_ADDRESS_PARAM_DEFAULT,
        )
      ) {
        // Use the new ViemEIP4361AuthProvider - no manual conversion needed!
        const viemAuthProvider = new ViemEIP4361AuthProvider(
          viemPublicClient,
          consumerAccount,
        );

        // Get the underlying ethers auth provider for context compatibility
        const ethersAuthProvider = viemAuthProvider.ethersProvider;
        conditionContext.addAuthProvider(
          USER_ADDRESS_PARAM_DEFAULT,
          ethersAuthProvider,
        );
      }

      // Decrypt message using viem
      const decryptedBytes = await decryptWithViem(
        viemPublicClient,
        DOMAIN,
        messageKitFromBytes,
        conditionContext,
      );
      const decryptedMessageString = fromBytes(decryptedBytes);

      // Verify decryption
      expect(decryptedMessageString).toEqual(messageString);
    }, 15000); // 15s timeout

    test('should encrypt and decrypt with viem using simple positive balance condition', async () => {
      // Create test message
      const messageString = 'This viem message tests simple balance condition';
      const message = toBytes(messageString);

      // Create simple positive balance condition (avoids problematic allowlist condition)
      const positiveBalanceCondition = new conditions.base.rpc.RpcCondition({
        chain: CHAIN_ID,
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: {
          comparator: '>=',
          value: 0,
        },
      });

      // Encrypt message with viem using simple condition
      const messageKit = await encryptWithViem(
        viemPublicClient,
        DOMAIN,
        message,
        positiveBalanceCondition,
        RITUAL_ID,
        encryptorAccount,
      );

      const encryptedBytes = messageKit.toBytes();

      // Prepare for decryption
      const messageKitFromBytes = ThresholdMessageKit.fromBytes(encryptedBytes);
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKitFromBytes);

      // Add auth provider using ViemEIP4361AuthProvider
      const viemAuthProvider = new ViemEIP4361AuthProvider(
        viemPublicClient,
        consumerAccount,
      );

      // Get the ethers-compatible auth provider for context
      const ethersAuthProvider = viemAuthProvider.ethersProvider;
      conditionContext.addAuthProvider(
        USER_ADDRESS_PARAM_DEFAULT,
        ethersAuthProvider,
      );

      // Decrypt message using viem
      const decryptedBytes = await decryptWithViem(
        viemPublicClient,
        DOMAIN,
        messageKitFromBytes,
        conditionContext,
      );
      const decryptedMessageString = fromBytes(decryptedBytes);

      // Verify decryption was successful
      expect(decryptedMessageString).toEqual(messageString);
    }, 15000); // 15s timeout

    test('should work with different viem account types', async () => {
      // This test verifies viem integration works with different account configurations
      const messageString = 'Testing different viem account types';
      const message = toBytes(messageString);

      // Create a simple condition
      const simpleCondition = new conditions.base.rpc.RpcCondition({
        chain: CHAIN_ID,
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: {
          comparator: '>=',
          value: 0,
        },
      });

      // Test encryption with viem account
      const messageKit = await encryptWithViem(
        viemPublicClient,
        DOMAIN,
        message,
        simpleCondition,
        RITUAL_ID,
        encryptorAccount,
      );

      // Test decryption with different viem client setup
      const anotherViemPublicClient = createPublicClient({
        chain: polygonAmoy,
        transport: http(RPC_PROVIDER_URL),
      });

      const messageKitFromBytes = ThresholdMessageKit.fromBytes(
        messageKit.toBytes(),
      );
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKitFromBytes);

      // Add auth provider using ViemEIP4361AuthProvider with different client
      const viemAuthProvider = new ViemEIP4361AuthProvider(
        anotherViemPublicClient,
        consumerAccount,
      );

      // Get the ethers-compatible auth provider
      const ethersAuthProvider = viemAuthProvider.ethersProvider;
      conditionContext.addAuthProvider(
        USER_ADDRESS_PARAM_DEFAULT,
        ethersAuthProvider,
      );

      // Decrypt using the different client
      const decryptedBytes = await decryptWithViem(
        anotherViemPublicClient,
        DOMAIN,
        messageKitFromBytes,
        conditionContext,
      );
      const decryptedMessageString = fromBytes(decryptedBytes);

      // Verify decryption
      expect(decryptedMessageString).toEqual(messageString);
    }, 15000); // 15s timeout
  },
);
