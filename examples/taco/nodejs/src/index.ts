import {
  conditions,
  decrypt,
  encrypt,
  getPorterUri,
  initialize,
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

  console.log('Encrypting message...');
  const message = toBytes('this is a secret');
  const ownsNFT = new conditions.ERC721Ownership({
    contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
    parameters: [3591],
    chain: 5,
  });
  const ritualId = 17; // Replace with your own ritual ID
  const messageKit = await encrypt(provider, message, ownsNFT, ritualId);

  console.log('Decrypting message...');
  const porterUri = getPorterUri('tapir'); // Test network
  const decryptedMessage = await decrypt(
    provider,
    messageKit,
    signer,
    porterUri,
  );

  console.assert(decryptedMessage === message);
};

runExample()
  .then(() => {
    console.log('Example finished.');
  })
  .catch((err) => {
    console.error('Example failed:', err);
  });
