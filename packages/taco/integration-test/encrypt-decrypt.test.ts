import { beforeAll, describe, expect, test } from 'vitest';

import { domains, fromBytes, toBytes } from '@nucypher/shared';
import {
  EIP4361AuthProvider,
  USER_ADDRESS_PARAM_DEFAULT,
} from '@nucypher/taco-auth';
import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
import {
  conditions,
  decrypt,
  encrypt,
  initialize,
  ThresholdMessageKit,
} from '../src';
import { CompoundCondition } from '../src/conditions/compound-condition';

dotenv.config({ path: 'integration-test/.env' });

// TODO: Enable and configure evn variables for this test as part of https://github.com/nucypher/taco-web/issues/638
// To run the test locally, unskip and use env variables similar to integration-test/.env.example
describe.skip('Taco Encrypt/Decrypt Integration Test', () => {
  let provider: ethers.providers.JsonRpcProvider;
  let domain: string;
  let ritualId: number;
  let chainId: number;
  let encryptorSigner: ethers.Wallet;
  let consumerSigner: ethers.Wallet;

  beforeAll(async () => {
    const rpcProviderUrl = process.env.RPC_PROVIDER_URL;
    if (!rpcProviderUrl) {
      throw new Error('RPC_PROVIDER_URL is not set.');
    }

    const encryptorPrivateKey = process.env.ENCRYPTOR_PRIVATE_KEY;
    if (!encryptorPrivateKey) {
      throw new Error('ENCRYPTOR_PRIVATE_KEY is not set.');
    }

    const consumerPrivateKey = process.env.CONSUMER_PRIVATE_KEY;
    if (!consumerPrivateKey) {
      throw new Error('CONSUMER_PRIVATE_KEY is not set.');
    }

    domain = process.env.DOMAIN || domains.TESTNET;
    ritualId = parseInt(process.env.RITUAL_ID || '6');
    provider = new ethers.providers.JsonRpcProvider(rpcProviderUrl);

    const CHAIN_ID_FOR_DOMAIN = {
      [domains.MAINNET]: 137,
      [domains.TESTNET]: 80002,
      [domains.DEVNET]: 80002,
    };
    chainId = CHAIN_ID_FOR_DOMAIN[domain];

    encryptorSigner = new ethers.Wallet(encryptorPrivateKey, provider);
    consumerSigner = new ethers.Wallet(consumerPrivateKey, provider);

    // Initialize the library
    await initialize();

    // Verify network connection
    const network = await provider.getNetwork();
    if (network.chainId !== chainId) {
      throw new Error(
        `Provider connected to wrong network. Expected ${chainId}, got ${network.chainId}`,
      );
    }
  });

  test('should encrypt and decrypt a message with large condition values %s', async (value) => {
    // Create test message
    const messageString = 'This is a secret 🤐';
    const message = toBytes(messageString);

    // Create conditions
    const hasPositiveBalance = new conditions.base.rpc.RpcCondition({
      chain: chainId,
      method: 'eth_getBalance',
      parameters: [':userAddress', 'latest'],
      returnValueTest: {
        comparator: '>=',
        value: 0,
      },
    });

    const balanceLessThanMaxUint = new conditions.base.rpc.RpcCondition({
      chain: chainId,
      method: 'eth_getBalance',
      parameters: [':userAddress', 'latest'],
      returnValueTest: {
        comparator: '<',
        // max uint256
        value: BigInt(
          '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        ),
      },
    });

    const balanceLessThanLargeFloatNumber =
      new conditions.base.rpc.RpcCondition({
        chain: chainId,
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: {
          comparator: '<',
          // 1000 ETH/PLY (this number is more than the safe max integer in javascript for this javascript handle it as a float)
          value: 1000000000000000000000,
        },
      });

    const compoundCondition = CompoundCondition.and([
      hasPositiveBalance,
      balanceLessThanMaxUint,
      balanceLessThanLargeFloatNumber,
    ]);

    // Encrypt message
    const messageKit = await encrypt(
      provider,
      domain,
      message,
      compoundCondition,
      ritualId,
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
      domain,
      messageKitFromBytes,
      conditionContext,
    );
    const decryptedMessageString = fromBytes(decryptedBytes);

    // Verify decryption
    expect(decryptedMessageString).toEqual(messageString);
  });
});
