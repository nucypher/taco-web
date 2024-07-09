import { format } from 'node:util';

import {
  conditions,
  decrypt,
  domains,
  EIP4361AuthProvider,
  encrypt,
  fromBytes,
  getPorterUri,
  initialize,
  ThresholdMessageKit,
  toBytes,
  toHexString,
} from '@nucypher/taco';
import * as dotenv from 'dotenv';
import { ethers } from 'ethers';

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
const ritualId = parseInt(process.env.RITUAL_ID || '0');
const provider = new ethers.providers.JsonRpcProvider(rpcProviderUrl);

console.log('Domain:', domain);
console.log('Ritual ID:', ritualId);

const encryptToBytes = async (messageString: string) => {
  const encryptorSigner = new ethers.Wallet(encryptorPrivateKey);
  console.log(
    "Encryptor signer's address:",
    await encryptorSigner.getAddress(),
  );

  const message = toBytes(messageString);
  console.log(format('Encrypting message ("%s") ...', messageString));

  const hasPositiveBalance = new conditions.base.rpc.RpcCondition({
    chain: 80002,
    method: 'eth_getBalance',
    parameters: [':userAddress', 'latest'],
    returnValueTest: {
      comparator: '>',
      value: 0,
    },
  });
  console.assert(
    hasPositiveBalance.requiresAuthentication(),
    'Condition requires authentication',
  );

  const messageKit = await encrypt(
    provider,
    domain,
    message,
    hasPositiveBalance,
    ritualId,
    encryptorSigner,
  );

  return messageKit.toBytes();
};

const decryptFromBytes = async (encryptedBytes: Uint8Array) => {
  const consumerSigner = new ethers.Wallet(consumerPrivateKey);
  console.log(
    "\nConsumer signer's address:",
    await consumerSigner.getAddress(),
  );

  const messageKit = ThresholdMessageKit.fromBytes(encryptedBytes);
  console.log('Decrypting message ...');
  const siweParams = {
    domain: 'localhost',
    uri: 'http://localhost:3000',
  };
  const authProvider = new EIP4361AuthProvider(provider, consumerSigner, siweParams);
  return decrypt(
    provider,
    domain,
    messageKit,
    authProvider,
    getPorterUri(domain),
  );
};

const runExample = async () => {
  // Make sure the provider is connected to Polygon Amoy testnet
  const network = await provider.getNetwork();
  if (network.chainId !== 80002) {
    console.error('Please connect to Polygon Amoy testnet');
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
