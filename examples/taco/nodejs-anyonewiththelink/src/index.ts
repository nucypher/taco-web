import { domains, initialize, toBytes } from '@nucypher/taco';
import * as dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const rpcProviderUrl = process.env.RPC_PROVIDER_URL;
if (!rpcProviderUrl) {
  throw new Error('RPC_PROVIDER_URL is not set.');
}

const signerPrivateKey = process.env.SIGNER_PRIVATE_KEY;
if (!signerPrivateKey) {
  throw new Error('SIGNER_PRIVATE_KEY is not set.');
}

const encryptorPrivateKey = process.env.ENCRYPTOR_PRIVATE_KEY;
if (!encryptorPrivateKey) {
  throw new Error('ENCRYPTOR_PRIVATE_KEY is not set.');
}

const domain = process.env.DOMAIN || domains.TESTNET;
const ritualId = parseInt(process.env.RITUAL_ID || '0');
const provider = new ethers.providers.JsonRpcProvider(rpcProviderUrl);

const generateToken = async () => {
  const nonce = 'hello'; // TODO: generate this randomly

  const signer = new ethers.Wallet(signerPrivateKey);
  const signature = await signer.signMessage(nonce);

  const token = {
    nonce: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(nonce)), // TODO: convert to hex string using taco functions
    signature: signature,
    signer: signer.address,
  };

  console.log('This token to be shared with the decryptor:', token);
  return JSON.stringify(token);
};

const encryptToBytes = async (token: string) => {
  const encryptorSigner = new ethers.Wallet(encryptorPrivateKey);
};

const runExample = async () => {
  // Make sure the provider is connected to Polygon Amoy testnet
  const network = await provider.getNetwork();
  if (network.chainId !== 80002) {
    console.error('Please connect to Polygon Amoy testnet');
  }
  await initialize();

  const token = await generateToken();
  const encryptedBytes = await encryptToBytes(token);
};

runExample().then(() => {
  console.log('Example finished');
});
