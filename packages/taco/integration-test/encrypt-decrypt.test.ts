import { beforeAll, describe, expect, test } from 'vitest';

import { fromBytes, toBytes } from '@nucypher/shared';
import {
  EIP4361AuthProvider,
  USER_ADDRESS_PARAM_DEFAULT,
} from '@nucypher/taco-auth';
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
  UINT256_MAX,
  createTestECDSACondition,
  createSignatureForPredefinedCondition,
} from '../test/test-utils';
import { randomBytes, createHash } from 'crypto';

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

    test('should encrypt and decrypt according to wallet allowlist condition', async () => {
      const messageString =
        'This message should only be accessible to allowed wallet addresses';
      const message = toBytes(messageString);

      const addressAllowlistCondition =
        new conditions.base.addressAllowlist.AddressAllowlistCondition({
          userAddress: ':userAddress',
          addresses: [
            CONSUMER_ADDRESS,
            '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
            '0x0000000000000000000000000000000000000001',
          ],
        });

      expect(addressAllowlistCondition.requiresAuthentication()).toBe(true);

      const messageKit = await encrypt(
        provider,
        DOMAIN,
        message,
        addressAllowlistCondition,
        RITUAL_ID,
        encryptorSigner,
      );

      const encryptedBytes = messageKit.toBytes();

      const messageKitFromBytes = ThresholdMessageKit.fromBytes(encryptedBytes);
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKitFromBytes);

      const authProvider = new EIP4361AuthProvider(provider, consumerSigner, {
        domain: 'localhost',
        uri: 'http://localhost:3000',
      });
      conditionContext.addAuthProvider(
        USER_ADDRESS_PARAM_DEFAULT,
        authProvider,
      );

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
      const messageString = 'This message is protected by ECDSA signature verification 🔐';
      const message = toBytes(messageString);

      const authorizationMessage = 'I authorize access to this encrypted data';
      
      // Create a predefined ECDSA condition (simulates server-side condition creation)
      const { condition: ecdsaCondition, privateKey } = createTestECDSACondition(authorizationMessage);

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

      expect(conditionContext.requestedContextParameters.has(':ecdsaSignature')).toBe(true);

      // Create signature using the predefined condition's private key
      const signatureHex = createSignatureForPredefinedCondition(
        { condition: ecdsaCondition.value, verifyingKey: ecdsaCondition.value.verifyingKey, privateKey },
        authorizationMessage
      );

      conditionContext.addCustomContextParameterValues({
        ':ecdsaSignature': signatureHex
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
      const { condition: ecdsaCondition } = createTestECDSACondition(authorizationMessage);

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
      const invalidSignature = '0x' + randomBytes(64).toString('hex');
      conditionContext.addCustomContextParameterValues({
        ':ecdsaSignature': invalidSignature.slice(2)
      });

      await expect(
        decrypt(
          provider,
          DOMAIN,
          messageKitFromBytes,
          conditionContext,
        )
      ).rejects.toThrow();
    }, 20000);

    test('should encrypt and decrypt with ECDSA condition using user address context', async () => {
      const messageString = 'This message uses both ECDSA and user address authentication 🔐🆔';
      const message = toBytes(messageString);

      // Create a predefined ECDSA condition that uses user address as the message
      const { condition: ecdsaCondition, privateKey } = createTestECDSACondition(USER_ADDRESS_PARAM_DEFAULT);

      expect(ecdsaCondition.requiresAuthentication()).toBe(true);

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

      expect(conditionContext.requestedContextParameters.has(USER_ADDRESS_PARAM_DEFAULT)).toBe(true);
      expect(conditionContext.requestedContextParameters.has(':ecdsaSignature')).toBe(true);

      const authProvider = new EIP4361AuthProvider(provider, consumerSigner);
      conditionContext.addAuthProvider(USER_ADDRESS_PARAM_DEFAULT, authProvider);

      // Sign the user's address with the predefined condition's private key
      const userAddress = await consumerSigner.getAddress();
      const signatureHex = createSignatureForPredefinedCondition(
        { condition: ecdsaCondition.value, verifyingKey: ecdsaCondition.value.verifyingKey, privateKey },
        userAddress
      );

      conditionContext.addCustomContextParameterValues({
        ':ecdsaSignature': signatureHex
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
