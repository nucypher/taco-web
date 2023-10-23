import {
  Alice,
  Bob,
  domains,
  getPorterUri,
  initialize,
  SecretKey,
} from '@nucypher/pre';
import { ethers } from 'ethers';
import { hexlify } from "ethers/lib/utils";

declare global {
  interface Window {
    ethereum?: ethers.providers.ExternalProvider;
  }
}

const txtEncoder = new TextEncoder();

const makeAlice = () => {
  const secretKey = SecretKey.fromBEBytes(
    txtEncoder.encode('fake-secret-key-32-bytes-alice-x'),
  );
  return Alice.fromSecretKey(secretKey);
};

const makeBob = () => {
  const secretKey = SecretKey.fromBEBytes(
    txtEncoder.encode('fake-secret-key-32-bytes-bob-xxx'),
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
  if (!window.ethereum) {
    console.error('You need to connect to your wallet first');
  }

  await initialize();

  alert('Sign a transaction to create a policy.');

  const provider = new ethers.providers.Web3Provider(window.ethereum!, 'any');
  await provider.send('eth_requestAccounts', []);

  const { chainId } = await provider.getNetwork();
  const mumbaiChainId = 80001;
  if (chainId !== mumbaiChainId) {
    // Switch to Polygon Mumbai testnet
    await window.ethereum!.request!({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexlify(mumbaiChainId) }],
    });
  }

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

  const alice = makeAlice();
  const policy = await alice.grant(
    provider,
    provider.getSigner(),
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
