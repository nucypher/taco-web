import {Alice, Bob, getPorterUri, SecretKey, toBytes} from '@nucypher/shared';
import { ethers } from 'ethers';

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
  const provider = ethers.Wallet.createRandom();

  const remoteBob = makeRemoteBob();
  const threshold = 2;
  const shares = 3;
  const startDate = new Date();
  const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // In 30 days
  const policyParams = {
    bob: remoteBob,
    label: getRandomLabel(),
    threshold,
    shares,
    startDate,
    endDate,
  };
  const porterUri = getPorterUri('tapir'); // Test network

  const alice = makeAlice();
  const policy = await alice.grant(
    provider.provider,
    provider,
    porterUri,
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
