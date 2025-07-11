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
import { UINT256_MAX } from '../test/test-utils';
import { randomBytes, createHash } from 'crypto';

const RPC_PROVIDER_URL = 'https://rpc-amoy.polygon.technology';
const ENCRYPTOR_PRIVATE_KEY =
  '0x900edb9e8214b2353f82aa195e915128f419a92cfb8bbc0f4784f10ef4112b86';
const CONSUMER_PRIVATE_KEY =
  '0xf307e165339cb5deb2b8ec59c31a5c0a957b8e8453ce7fe8a19d9a4c8acf36d4';
const DOMAIN = 'lynx';
const RITUAL_ID = 27;
const CHAIN_ID = 80002;

// The wallet address of our consumer
const CONSUMER_ADDRESS = ethers.utils.computeAddress(CONSUMER_PRIVATE_KEY);

// skip integration test if RUNNING_IN_CI is not set (it is set in CI environments)
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

    test('should encrypt and decrypt a message with RPC balance condition less than UINT256_MAX', async (value) => {
      // Create test message
      const messageString = 'This is a secret 🤐';
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

      // Encrypt message
      const messageKit = await encrypt(
        provider,
        DOMAIN,
        message,
        compoundCondition,
        RITUAL_ID,
        encryptorSigner,
      );

      const encryptedBytes = messageKit.toBytes();

      // Prepare for decryption
      const messageKitFromBytes = ThresholdMessageKit.fromBytes(encryptedBytes);
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKitFromBytes);

      // Add auth provider for condition
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

      // Decrypt message
      const decryptedBytes = await decrypt(
        provider,
        DOMAIN,
        messageKitFromBytes,
        conditionContext,
      );
      const decryptedMessageString = fromBytes(decryptedBytes);

      // Verify decryption
      expect(decryptedMessageString).toEqual(messageString);
    }, 15000); // 15s timeout

    test('should encrypt and decrypt according to wallet allowlist condition', async () => {
      // Create test message
      const messageString =
        'This message should only be accessible to allowed wallet addresses';
      const message = toBytes(messageString);

      // Create wallet allowlist condition with consumer address in the list
      const addressAllowlistCondition =
        new conditions.base.addressAllowlist.AddressAllowlistCondition({
          userAddress: ':userAddress',
          addresses: [
            CONSUMER_ADDRESS,
            '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', // Some other address
            '0x0000000000000000000000000000000000000001', // Another address
          ],
        });

      // Verify that the condition requires authentication
      expect(addressAllowlistCondition.requiresAuthentication()).toBe(true);

      // Encrypt message with the wallet allowlist condition
      const messageKit = await encrypt(
        provider,
        DOMAIN,
        message,
        addressAllowlistCondition,
        RITUAL_ID,
        encryptorSigner,
      );

      const encryptedBytes = messageKit.toBytes();

      // Prepare for decryption
      const messageKitFromBytes = ThresholdMessageKit.fromBytes(encryptedBytes);
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKitFromBytes);

      // Add auth provider for the consumer wallet
      const authProvider = new EIP4361AuthProvider(provider, consumerSigner, {
        domain: 'localhost',
        uri: 'http://localhost:3000',
      });
      conditionContext.addAuthProvider(
        USER_ADDRESS_PARAM_DEFAULT,
        authProvider,
      );

      // Decrypt message
      const decryptedBytes = await decrypt(
        provider,
        DOMAIN,
        messageKitFromBytes,
        conditionContext,
      );
      const decryptedMessageString = fromBytes(decryptedBytes);

      // Verify decryption was successful
      expect(decryptedMessageString).toEqual(messageString);
    }, 15000); // 15s timeout

    test('should encrypt and decrypt according to ECDSA signature condition', async () => {
      // Create test message
      const messageString = 'This message is protected by ECDSA signature verification 🔐';
      const message = toBytes(messageString);

      // Create a test ECDSA keypair for this test
      const ecdsaWallet = ethers.Wallet.createRandom();
      const verifyingKey = ecdsaWallet.publicKey.slice(2); // Remove '0x' prefix for uncompressed public key

      // Message that needs to be signed for authorization
      const authorizationMessage = 'I authorize access to this encrypted data';
      
      // Create the signature that matches Python backend expectations
      // Python uses SHA-256 and expects raw signature format
      const messageHash = createHash('sha256').update(Buffer.from(authorizationMessage, 'utf8')).digest();
      
      // Sign the hash with our private key
      const signingKey = new ethers.utils.SigningKey(ecdsaWallet.privateKey);
      const signature = signingKey.signDigest(messageHash);
      
      // Convert signature to hex format expected by Python (r+s format without 0x prefix)
      const rHex = signature.r.slice(2).padStart(64, '0');
      const sHex = signature.s.slice(2).padStart(64, '0');
      const signatureHex = rHex + sHex;

      console.log('🔐 ECDSA Test Setup:');
      console.log(`   Message: "${authorizationMessage}"`);
      console.log(`   Message Hash: ${messageHash.toString('hex')}`);
      console.log(`   Private Key: ${ecdsaWallet.privateKey}`);
      console.log(`   Public Key: ${verifyingKey}`);
      console.log(`   Signature R: ${rHex}`);
      console.log(`   Signature S: ${sHex}`);
      console.log(`   Full Signature: ${signatureHex}`);

      // Create ECDSA condition that verifies the signature
      const ecdsaCondition = new conditions.base.ecdsa.ECDSACondition({
        message: authorizationMessage,
        signature: ':ecdsaSignature',
        verifyingKey: verifyingKey,
        curve: 'SECP256k1',
      });

      // ECDSA condition doesn't require wallet authentication (requiresAuthentication = false)
      // but it does have context variables that need to be provided
      expect(ecdsaCondition.requiresAuthentication()).toBe(false);

      // Encrypt message with the ECDSA condition
      const messageKit = await encrypt(
        provider,
        DOMAIN,
        message,
        ecdsaCondition,
        RITUAL_ID,
        encryptorSigner,
      );

      const encryptedBytes = messageKit.toBytes();

      // Prepare for decryption
      const messageKitFromBytes = ThresholdMessageKit.fromBytes(encryptedBytes);
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKitFromBytes);

      // Verify that the context requires the ECDSA signature parameter
      expect(conditionContext.requestedContextParameters.has(':ecdsaSignature')).toBe(true);

      // Add the signature to the condition context in the format expected by Python
      conditionContext.addCustomContextParameterValues({
        ':ecdsaSignature': signatureHex
      });

      // Decrypt message
      const decryptedBytes = await decrypt(
        provider,
        DOMAIN,
        messageKitFromBytes,
        conditionContext,
      );
      const decryptedMessageString = fromBytes(decryptedBytes);

      // Verify decryption was successful
      expect(decryptedMessageString).toEqual(messageString);

      console.log('✅ ECDSA condition test passed!');
      console.log(`   Decrypted Message: "${decryptedMessageString}"`);
    }, 20000); // 20s timeout

    test('should fail to decrypt with ECDSA condition when signature is invalid', async () => {
      // Create test message
      const messageString = 'This should fail with wrong signature';
      const message = toBytes(messageString);

      // Create a test ECDSA keypair
      const ecdsaWallet = ethers.Wallet.createRandom();
      const verifyingKey = ecdsaWallet.publicKey.slice(2);

      // Message that needs to be signed
      const authorizationMessage = 'I authorize access to this encrypted data';

      // Create ECDSA condition
      const ecdsaCondition = new conditions.base.ecdsa.ECDSACondition({
        message: authorizationMessage,
        signature: ':ecdsaSignature',
        verifyingKey: verifyingKey,
        curve: 'SECP256k1',
      });

      // Encrypt message
      const messageKit = await encrypt(
        provider,
        DOMAIN,
        message,
        ecdsaCondition,
        RITUAL_ID,
        encryptorSigner,
      );

      const encryptedBytes = messageKit.toBytes();

      // Prepare for decryption with INVALID signature
      const messageKitFromBytes = ThresholdMessageKit.fromBytes(encryptedBytes);
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKitFromBytes);

      // Add an INVALID signature (just random hex)
      const invalidSignature = '0x' + randomBytes(64).toString('hex');
      conditionContext.addCustomContextParameterValues({
        ':ecdsaSignature': invalidSignature.slice(2)
      });

      // Attempt to decrypt should fail
      await expect(
        decrypt(
          provider,
          DOMAIN,
          messageKitFromBytes,
          conditionContext,
        )
      ).rejects.toThrow();

      console.log('✅ ECDSA invalid signature test passed - decryption properly failed');
    }, 20000); // 20s timeout

    test('should encrypt and decrypt with ECDSA condition using user address context', async () => {
      // Create test message
      const messageString = 'This message uses both ECDSA and user address authentication 🔐🆔';
      const message = toBytes(messageString);

      // Create a test ECDSA keypair
      const ecdsaWallet = ethers.Wallet.createRandom();
      const verifyingKey = ecdsaWallet.publicKey.slice(2);

      // Create ECDSA condition that uses user address as the message
      const ecdsaCondition = new conditions.base.ecdsa.ECDSACondition({
        message: USER_ADDRESS_PARAM_DEFAULT, // This makes it require wallet authentication
        signature: ':ecdsaSignature',
        verifyingKey: verifyingKey,
        curve: 'SECP256k1',
      });

      // Now it should require authentication because it uses :userAddress
      expect(ecdsaCondition.requiresAuthentication()).toBe(true);

      // Encrypt message
      const messageKit = await encrypt(
        provider,
        DOMAIN,
        message,
        ecdsaCondition,
        RITUAL_ID,
        encryptorSigner,
      );

      const encryptedBytes = messageKit.toBytes();

      // Prepare for decryption
      const messageKitFromBytes = ThresholdMessageKit.fromBytes(encryptedBytes);
      const conditionContext =
        conditions.context.ConditionContext.fromMessageKit(messageKitFromBytes);

      // Verify context parameters
      expect(conditionContext.requestedContextParameters.has(USER_ADDRESS_PARAM_DEFAULT)).toBe(true);
      expect(conditionContext.requestedContextParameters.has(':ecdsaSignature')).toBe(true);

      // Add auth provider for user address
      const authProvider = new EIP4361AuthProvider(provider, consumerSigner);
      conditionContext.addAuthProvider(USER_ADDRESS_PARAM_DEFAULT, authProvider);

      // Sign the user's address with our test key using correct format
      const userAddress = await consumerSigner.getAddress();
      const messageHash = createHash('sha256').update(Buffer.from(userAddress, 'utf8')).digest();
      const signingKey = new ethers.utils.SigningKey(ecdsaWallet.privateKey);
      const signature = signingKey.signDigest(messageHash);
      
      // Convert signature to hex format expected by Python (r+s format without 0x prefix)
      const rHex = signature.r.slice(2).padStart(64, '0');
      const sHex = signature.s.slice(2).padStart(64, '0');
      const signatureHex = rHex + sHex;

      // Add the ECDSA signature to context
      conditionContext.addCustomContextParameterValues({
        ':ecdsaSignature': signatureHex
      });

      // Decrypt message
      const decryptedBytes = await decrypt(
        provider,
        DOMAIN,
        messageKitFromBytes,
        conditionContext,
      );
      const decryptedMessageString = fromBytes(decryptedBytes);

      // Verify decryption was successful
      expect(decryptedMessageString).toEqual(messageString);

      console.log('✅ ECDSA + User Address condition test passed!');
      console.log(`   Message: "${messageString}"`);
      console.log(`   User Address: ${userAddress}`);
      console.log(`   ECDSA Signature: ${signatureHex.slice(0, 20)}...`);
    }, 25000); // 25s timeout
  },
);
