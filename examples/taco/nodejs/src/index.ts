import {
  conditions,
  decrypt,
  domains,
  encrypt,
  fromBytes,
  getPorterUri,
  initialize,
  toBytes,
  toHexString
} from '@nucypher/taco';
import * as dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const rpcProviderUrl = process.env.RPC_PROVIDER_URL;
if (!rpcProviderUrl) {
  throw new Error('RPC_PROVIDER_URL is not set.');
}

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error('PRIVATE_KEY is not set.');
}

const runExample = async () => {
  await initialize();

  const signer = new ethers.Wallet(privateKey);
  const provider = new ethers.providers.JsonRpcProvider(rpcProviderUrl);

  // Make sure the provider is connected to Mumbai testnet
  const network = await provider.getNetwork();
  if (network.chainId !== 80001) {
    console.error('Please connect to Mumbai testnet');
  }

  console.log("Signer's address:", await signer.getAddress());

  console.log('Encrypting message...');
  const messageString = 'this is a secret';
  const message = toBytes(messageString);
  const hasPositiveBalance = new conditions.RpcCondition({
    chain: 80001,
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
  const ritualId = 5; // Replace with your own ritual ID
  const messageKit = await encrypt(
    provider,
    domains.TESTNET,
    message,
    hasPositiveBalance,
    ritualId,
    signer,
  );
  console.log('Ciphertext: ', toHexString(messageKit.toBytes()));

  console.log('Decrypting message...');
  const decryptedBytes = await decrypt(
    provider,
    domains.TESTNET,
    messageKit,
    getPorterUri(domains.TESTNET),
    signer,
  );
  const decryptedMessageString = fromBytes(decryptedBytes);
  console.log('Decrypted message:', decryptedMessageString);
  console.assert(
    decryptedMessageString === messageString,
    'Decrypted message is different to original message',
  );
};

runExample()
  .then(() => {
    console.log('Example finished');
  });
