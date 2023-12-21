import { format } from 'node:util';

import { ThresholdMessageKit } from '@nucypher/nucypher-core';
import {
  conditions,
  decrypt,
  domains,
  encrypt,
  fromBytes,
  getPorterUri,
  initialize,
  toBytes,
  toHexString,
} from '@nucypher/taco';
import * as dotenv from 'dotenv';
import { Hex, createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonMumbai } from 'viem/chains';

dotenv.config();

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

const domain = process.env.DOMAIN || domains.TESTNET;
const ritualId = parseInt(process.env.RITUAL_ID || '5');

const publicClient = createPublicClient({
  transport: http(rpcProviderUrl),
  chain: polygonMumbai,
});

const encryptorAccount = privateKeyToAccount(<Hex>encryptorPrivateKey);
const encryptorWalletClient = createWalletClient({
  transport: http(rpcProviderUrl),
  account: encryptorAccount,
  chain: polygonMumbai,
});

const consumerAccount = privateKeyToAccount(<Hex>consumerPrivateKey);
const consumerWalletClient = createWalletClient({
  transport: http(rpcProviderUrl),
  account: consumerAccount,
  chain: polygonMumbai,
});

console.log('Domain:', domain);
console.log('Ritual ID:', ritualId);

const encryptToBytes = async (messageString: string) => {
  // Make sure the provider is connected to Mumbai testnet
  const chainId = await encryptorWalletClient.getChainId();
  if (chainId !== polygonMumbai.id) {
    console.error('Please connect to Mumbai testnet');
  }

  console.log("Encryptor signer's address:", encryptorAccount.address);

  const message = toBytes(messageString);
  console.log(format('Encrypting message ("%s") ...', messageString));

  const hasPositiveBalance = new conditions.RpcCondition({
    chain: polygonMumbai.id,
    method: 'eth_getBalance',
    parameters: [':userAddress', 'latest'],
    returnValueTest: {
      comparator: '>',
      value: 0,
    },
  });
  console.assert(
    hasPositiveBalance.requiresSigner(),
    'Condition requires signer',
  );

  const messageKit = await encrypt(
    publicClient,
    domain,
    message,
    hasPositiveBalance,
    ritualId,
    encryptorWalletClient,
  );

  return messageKit.toBytes();
};

const decryptFromBytes = async (encryptedBytes: Uint8Array) => {
  console.log("\nConsumer signer's address:", consumerAccount.address);

  const messageKit = ThresholdMessageKit.fromBytes(encryptedBytes);
  console.log('Decrypting message ...');
  return decrypt(
    publicClient,
    domain,
    messageKit,
    getPorterUri(domain),
    consumerWalletClient,
  );
};

const runExample = async () => {
  // Make sure the provider is connected to Mumbai testnet
  const chainId = await publicClient.getChainId();
  if (chainId !== polygonMumbai.id) {
    console.error('Please connect to Mumbai testnet');
  }
  await initialize();

  const messageString = 'This is a secret 🤐';
  const encryptedBytes = await encryptToBytes(messageString);
  console.log('Ciphertext: ', toHexString(encryptedBytes));

  const decryptedBytes = await decryptFromBytes(encryptedBytes);
  const decryptedMessageString = fromBytes(decryptedBytes);
  console.log('Decrypted message:', decryptedMessageString);

  console.assert(
    decryptedMessageString === messageString,
    'Decrypted message is different to original message',
  );
};

runExample().then(() => {
  console.log('Example finished');
});
