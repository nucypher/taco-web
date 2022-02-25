import { Alice, Bob } from '@nucypher/nucypher-ts';
import { ethers } from 'ethers';

const config = {
  // Public Porter endpoint on Lynx network
  porterUri: 'https://porter-lynx.nucypher.community/',
};

const makeAlice = (provider) => {
  const secretKey = Buffer.from('fake-secret-key-32-bytes-alice-x');
  return Alice.fromSecretKeyBytes(config, secretKey, provider);
};

const makeBob = () => {
  const secretKey = Buffer.from('fake-secret-key-32-bytes-bob-xxx');
  return Bob.fromSecretKey(config, secretKey);
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
  if (!window.ethereum) {
    console.error('You need to connect to the MetaMask extension');
  }

  alert('Sign a transaction to create a policy.');

  const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
  await provider.send('eth_requestAccounts', []);

  const remoteBob = makeRemoteBob();
  const threshold = 2;
  const shares = 3;
  const paymentPeriods = 3;
  const policyParams = {
    bob: remoteBob,
    label: getRandomLabel(),
    threshold,
    shares,
    paymentPeriods,
  };

  const alice = makeAlice(provider);
  const includeUrsulas = [];
  const excludeUrsulas = [];
  const policy = await alice.grant(
    policyParams,
    includeUrsulas,
    excludeUrsulas
  );

  console.log('Policy created:');
  console.log({ policy });
};

runExample();
