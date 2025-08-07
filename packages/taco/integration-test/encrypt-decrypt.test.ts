import { beforeAll, describe, expect, test } from 'vitest';

import { fromBytes, toBytes } from '@nucypher/shared';
import {
  EIP4361AuthProvider,
  USER_ADDRESS_PARAM_DEFAULT,
} from '@nucypher/taco-auth';
import { randomBytes } from 'crypto';
import { ethers } from 'ethers';
import {
  conditions,
  decrypt,
  encrypt,
  initialize,
  ThresholdMessageKit,
} from '../src';
import { CompoundCondition } from '../src/conditions/compound-condition';
import {
  createSignatureForTestSecp256k1ECDSACondition,
  createTestSecp256k1ECDSACondition,
  UINT256_MAX,
} from '../test/test-utils';

const RPC_PROVIDER_URL = 'https://rpc-amoy.polygon.technology';
const ENCRYPTOR_PRIVATE_KEY =
  '0x900edb9e8214b2353f82aa195e915128f419a92cfb8bbc0f4784f10ef4112b86';
const CONSUMER_PRIVATE_KEY =
  '0xf307e165339cb5deb2b8ec59c31a5c0a957b8e8453ce7fe8a19d9a4c8acf36d4';
const DOMAIN = 'lynx';
const RITUAL_ID = 27;
const CHAIN_ID = 80002;

const CONSUMER_ADDRESS = ethers.utils.computeAddress(CONSUMER_PRIVATE_KEY);

describe.skipIf(!process.env.RUNNING_IN_CI)(
  'TACo Encrypt/Decrypt Integration Test',
  () => {
    let provider: ethers.providers.JsonRpcProvider;
    let encryptorSigner: ethers.Wallet;
    let consumerSigner: ethers.Wallet;

    beforeAll(async () => {
      provider = new ethers.providers.JsonRpcProvider(RPC_PROVIDER_URL);
      encryptorSigner = new ethers.Wallet(ENCRYPTOR_PRIVATE_KEY, provider);
      consumerSigner = new ethers.Wallet(CONSUMER_PRIVATE_KEY, provider);

      await initialize();

      const network = await provider.getNetwork();
      if (network.chainId !== CHAIN_ID) {
        throw new Error(
          `Provider connected to wrong network. Expected ${CHAIN_ID}, got ${network.chainId}`,
        );
      }
    });

    test('should encrypt and decrypt a message with RPC balance condition less than UINT256_MAX', async (value) => {
      const messageString = 'This is a secret 🤐';
      const message = toBytes(messageString);

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
            value: UINT256_MAX,
          },
        },
      );

      const compoundCondition = CompoundCondition.and([
        hasPositiveBalance,
        balanceLessThanMaxUintBigInt,
      ]);

      const messageKit = await encrypt(
        provider,
        DOMAIN,
        message,
        compoundCondition,
        RITUAL_ID,
        encryptorSigner,
      );

      const encryptedBytes = messageKit.toBytes();

      const messageKitFromBytes = ThresholdMessageKit.fromBytes(encryptedBytes);
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKitFromBytes);

      if (
        conditionContext.requestedContextParameters.has(
          USER_ADDRESS_PARAM_DEFAULT,
        )
      ) {
        const authProvider = new EIP4361AuthProvider(provider, consumerSigner);
        conditionContext.addAuthProvider(
          USER_ADDRESS_PARAM_DEFAULT,
          authProvider,
        );
      }

      const decryptedBytes = await decrypt(
        provider,
        DOMAIN,
        messageKitFromBytes,
        conditionContext,
      );
      const decryptedMessageString = fromBytes(decryptedBytes);

      expect(decryptedMessageString).toEqual(messageString);
    }, 15000);

    test('should encrypt and decrypt according to ECDSA signature condition with predefined verifying key', async () => {
      const messageString =
        'This message is protected by ECDSA signature verification 🔐';
      const message = toBytes(messageString);

      const authorizationMessage = 'I authorize access to this encrypted data';

      // Create a predefined ECDSA condition (simulates server-side condition creation)
      const { condition: ecdsaCondition, privateKey } =
        createTestSecp256k1ECDSACondition(authorizationMessage);

      expect(ecdsaCondition.requiresAuthentication()).toBe(false);

      const messageKit = await encrypt(
        provider,
        DOMAIN,
        message,
        ecdsaCondition,
        RITUAL_ID,
        encryptorSigner,
      );

      const encryptedBytes = messageKit.toBytes();

      const messageKitFromBytes = ThresholdMessageKit.fromBytes(encryptedBytes);
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKitFromBytes);

      expect(
        conditionContext.requestedContextParameters.has(':signature'),
      ).toBeTruthy();

      // Create signature using the predefined condition's private key
      const signatureHex = createSignatureForTestSecp256k1ECDSACondition(
        {
          condition: ecdsaCondition,
          privateKey,
        },
        authorizationMessage,
      );

      conditionContext.addCustomContextParameterValues({
        ':signature': signatureHex,
      });

      const decryptedBytes = await decrypt(
        provider,
        DOMAIN,
        messageKitFromBytes,
        conditionContext,
      );
      const decryptedMessageString = fromBytes(decryptedBytes);

      expect(decryptedMessageString).toEqual(messageString);
    }, 20000);

    test('should fail to decrypt with ECDSA condition when signature is invalid', async () => {
      const messageString = 'This should fail with wrong signature';
      const message = toBytes(messageString);

      const authorizationMessage = 'I authorize access to this encrypted data';

      // Create a predefined ECDSA condition (simulates server-side condition creation)
      const { condition: ecdsaCondition } =
        createTestSecp256k1ECDSACondition(authorizationMessage);

      const messageKit = await encrypt(
        provider,
        DOMAIN,
        message,
        ecdsaCondition,
        RITUAL_ID,
        encryptorSigner,
      );

      const encryptedBytes = messageKit.toBytes();

      const messageKitFromBytes = ThresholdMessageKit.fromBytes(encryptedBytes);
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKitFromBytes);

      // Add invalid signature
      const invalidSignature = randomBytes(64).toString('hex');
      conditionContext.addCustomContextParameterValues({
        ':signature': invalidSignature,
      });

      await expect(
        decrypt(provider, DOMAIN, messageKitFromBytes, conditionContext),
      ).rejects.toThrow();
    }, 20000);

    test('should encrypt and decrypt with ECDSA condition using context parameters', async () => {
      const messageString =
        'This message uses ECDSA signature verification with context parameters 🔐✍️';
      const message = toBytes(messageString);

      // Create a predefined ECDSA condition that uses :message context parameter
      const { condition: ecdsaCondition, privateKey } =
        createTestSecp256k1ECDSACondition(':message');

      // ECDSA conditions with :message and :signature don't require auth providers
      // like :userAddress does, they just need context parameters to be provided
      expect(ecdsaCondition.requiresAuthentication()).toBe(false);

      const messageKit = await encrypt(
        provider,
        DOMAIN,
        message,
        ecdsaCondition,
        RITUAL_ID,
        encryptorSigner,
      );

      const encryptedBytes = messageKit.toBytes();

      const messageKitFromBytes = ThresholdMessageKit.fromBytes(encryptedBytes);
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKitFromBytes);

      expect(
        conditionContext.requestedContextParameters.has(':message'),
      ).toBeTruthy();
      expect(
        conditionContext.requestedContextParameters.has(':signature'),
      ).toBeTruthy();

      // Define the message to be signed (provided via :message context parameter)
      const messageToSign = 'User authentication message';

      // Sign the message with the predefined condition's private key
      const signatureHex = createSignatureForTestSecp256k1ECDSACondition(
        {
          condition: ecdsaCondition,
          privateKey,
        },
        messageToSign,
      );

      conditionContext.addCustomContextParameterValues({
        ':message': messageToSign,
        ':signature': signatureHex,
      });

      const decryptedBytes = await decrypt(
        provider,
        DOMAIN,
        messageKitFromBytes,
        conditionContext,
      );
      const decryptedMessageString = fromBytes(decryptedBytes);

      expect(decryptedMessageString).toEqual(messageString);
    }, 25000);
  },
);
