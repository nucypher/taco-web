import {
  Alice,
  Bob,
  domains,
  getPorterUri,
  initialize,
  SecretKey,
  toBytes,
} from '@nucypher/pre';
import * as dotenv from 'dotenv';
import { createWalletClient, Hex, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

dotenv.config();

const rpcProviderUrl = process.env.RPC_PROVIDER_URL;
if (!rpcProviderUrl) {
  throw new Error('RPC_PROVIDER_URL is not set.');
}

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  throw new Error('PRIVATE_KEY is not set.');
}

const makeAlice = () => {
  const secretKey = SecretKey.fromBEBytes(
    toBytes('fake-secret-key-32-bytes-alice-x'),
  );
  return Alice.fromSecretKey(secretKey);
};

const makeBob = () => {
  const secretKey = SecretKey.fromBEBytes(
    toBytes('fake-secret-key-32-bytes-bob-xxx'),
  );
  return Bob.fromSecretKey(secretKey);
};

const makeRemoteBob = () => {
  // The difference between a "Bob" and a "remote Bob" is that we only have
  // access to public parameters in the latter, whereas in the former
  // we also have access to Bob's secret key
  const { decryptingKey, verifyingKey } = makeBob();
  return { decryptingKey, verifyingKey };
};

const getRandomLabel = () => `label-${new Date().getTime()}`;

const runExample = async () => {
  await initialize();

  const account = privateKeyToAccount(<Hex>privateKey);
  const walletClient = createWalletClient({
    transport: http(rpcProviderUrl),
    account,
  });

  // Make sure the provider is connected to Mumbai testnet
  const chainId = await walletClient.getChainId();
  if (chainId !== 80001) {
    console.error('Please connect to Mumbai testnet');
  }

  const policyParams = {
    bob: makeRemoteBob(),
    label: getRandomLabel(),
    threshold: 2,
    shares: 3,
    startDate: new Date(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // In 30 days,
  };
  const alice = makeAlice();

  console.log('Creating policy...');
  const policy = await alice.grant(
    walletClient,
    domains.TESTNET,
    getPorterUri(domains.TESTNET),
    policyParams,
  );

  console.log('Policy created:');
  console.log({ policy });
};

runExample()
  .then(() => {
    console.log('Example finished.');
  })
  .catch((err) => {
    console.error('Example failed:', err);
  });
