import {
  conditions,
  decrypt,
  encrypt,
  fromBytes,
  getPorterUri,
  initialize,
  TACO_DOMAIN,
  toBytes,
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

  console.log("Signer's address:", await signer.getAddress());

  console.log('Encrypting message...');
  const messageString = 'this is a secret';
  const message = toBytes(messageString);
  const hasPositiveBalance = new conditions.RpcCondition({
    conditionType: 'rpc',
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
  const ritualId = 1; // Replace with your own ritual ID
  const messageKit = await encrypt(
    provider,
    message,
    hasPositiveBalance,
    ritualId,
    signer,
  );

  console.log('Decrypting message...');
  const porterUri = getPorterUri(TACO_DOMAIN.DEV);
  const decryptedBytes = await decrypt(provider, messageKit, porterUri, signer);
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
  })
  .catch((err) => {
    console.error('Example failed:', err);
  });
