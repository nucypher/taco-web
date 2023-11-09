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

const creatorPrivateKey = process.env.CREATOR_PRIVATE_KEY;
if (!creatorPrivateKey) {
  throw new Error('CREATOR_PRIVATE_KEY is not set.');
}

const consumerPrivateKey = process.env.CONSUMER_PRIVATE_KEY;
if (!consumerPrivateKey) {
  throw new Error('CONSUMER_PRIVATE_KEY is not set.');
}

const runExample = async () => {
  await initialize();

  const domain = domains.TESTNET
  const ritualId = 5; // Replace with your own ritual ID
  const provider = new ethers.providers.JsonRpcProvider(rpcProviderUrl);

  // Make sure the provider is connected to Mumbai testnet
  const network = await provider.getNetwork();
  if (network.chainId !== 80001) {
    console.error('Please connect to Mumbai testnet');
  }
  
  ////
  // Encryption
  ////

  const creatorSigner = new ethers.Wallet(creatorPrivateKey);
  console.log("Creator signer's address:", await creatorSigner.getAddress());

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
  
  const messageKit = await encrypt(
    provider,
    domain,
    message,
    hasPositiveBalance,
    ritualId,
    creatorSigner,
  );
  console.log('Ciphertext: ', toHexString(messageKit.toBytes()));


  ////
  // Decryption
  ////

  const consumerSigner = new ethers.Wallet(consumerPrivateKey);
  console.log("\nConsumer signer's address:", await consumerSigner.getAddress());

  console.log('Decrypting message...');
  const decryptedBytes = await decrypt(
    provider,
    domain,
    messageKit,
    getPorterUri(domain),
    consumerSigner,
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
