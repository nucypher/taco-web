import { beforeAll, describe, expect, test } from 'vitest';

import { fromBytes, toBytes } from '@nucypher/shared';
import {
  EIP4361AuthProvider,
  USER_ADDRESS_PARAM_DEFAULT,
} from '@nucypher/taco-auth';
import { ethers } from 'ethers';
import { Account, createPublicClient, http, PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';
import {
  conditions,
  decrypt,
  encrypt,
  initialize,
  ThresholdMessageKit,
} from '../src';
import { CompoundCondition } from '../src/conditions/compound-condition';
import { UINT256_MAX } from '../test/test-utils';

const RPC_PROVIDER_URL = 'https://rpc-amoy.polygon.technology';
const ENCRYPTOR_PRIVATE_KEY =
  '0x900edb9e8214b2353f82aa195e915128f419a92cfb8bbc0f4784f10ef4112b86';
const CONSUMER_PRIVATE_KEY =
  '0xf307e165339cb5deb2b8ec59c31a5c0a957b8e8453ce7fe8a19d9a4c8acf36d4';
const DOMAIN = 'lynx';
const RITUAL_ID = 27;
const CHAIN_ID = 80002;

describe
  .skipIf(!process.env.RUNNING_IN_CI)
  .each<
    | [string, ethers.providers.Provider, ethers.Wallet, ethers.Wallet]
    | [string, PublicClient, Account, Account]
  >([
    [
      'ethers',
      new ethers.providers.JsonRpcProvider(RPC_PROVIDER_URL),
      new ethers.Wallet(ENCRYPTOR_PRIVATE_KEY),
      new ethers.Wallet(CONSUMER_PRIVATE_KEY),
    ],
    [
      'viem',
      createPublicClient({
        chain: polygonAmoy,
        transport: http(RPC_PROVIDER_URL),
      }),
      privateKeyToAccount(ENCRYPTOR_PRIVATE_KEY),
      privateKeyToAccount(CONSUMER_PRIVATE_KEY),
    ],
  ])(
  'Taco Encrypt/Decrypt Integration Test',
  (label, provider, encryptorSigner, consumerSigner) => {
    beforeAll(async () => {
      // Initialize the library
      await initialize();

      // Verify network connection
      let chainId: number;
      if (provider instanceof ethers.providers.Provider) {
        chainId = (await provider.getNetwork()).chainId;
      } else {
        chainId = provider.chain!.id as number;
      }
      if (chainId !== CHAIN_ID) {
        throw new Error(
          `Provider connected to wrong network. Expected ${CHAIN_ID}, got ${chainId}`,
        );
      }
    });

    test(`should encrypt and decrypt a message with large condition values using ${label}`, async () => {
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
        const authProvider = new EIP4361AuthProvider(provider, consumerSigner, {
          domain: 'localhost',
          uri: 'http://localhost:3000',
        });
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
  },
);
