'use client';
import {
  Alice,
  Bob,
  EnactedPolicy,
  getPorterUri,
  initialize,
  SecretKey,
  toHexString,
} from '@nucypher/pre';
import {ethers} from 'ethers';
import {useEffect, useState} from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

function App() {
  const [isInit, setIsInit] = useState<boolean>(false);
  const [provider, setProvider] = useState<
    ethers.providers.Web3Provider | undefined
  >();
  const [alice, setAlice] = useState<Alice | undefined>();
  const [bob, setBob] = useState<Bob | undefined>();
  const [policy, setPolicy] = useState<EnactedPolicy>();

  const initNucypher = async () => {
    await initialize();
    setIsInit(true);
  };

  const loadWeb3Provider = async () => {
    if (!window.ethereum) {
      console.error('You need to connect to the MetaMask extension');
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');

    const {chainId} = await provider.getNetwork();
    if (chainId !== 80001) {
      // Switch to Matic Mumbai testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{chainId: '0x13881'}],
      });
    }

    await provider.send('eth_requestAccounts', []);
    setProvider(provider);
  };

  useEffect(() => {
    initNucypher();
    loadWeb3Provider();
  }, []);

  if (!isInit || !provider) {
    return <div>Loading...</div>;
  }

  const makeAlice = () => {
    const alice = Alice.fromSecretKey(SecretKey.random());
    setAlice(alice);
  };

  const makeBob = () => {
    const bob = Bob.fromSecretKey(SecretKey.random());
    setBob(bob);
  };

  const makeRemoteBob = (bob: Bob) => {
    const {decryptingKey, verifyingKey} = bob;
    return {decryptingKey, verifyingKey};
  };

  const makeCharacters = () => {
    makeAlice();
    makeBob();
  };

  const getRandomLabel = () => `label-${new Date().getTime()}`;

  const runExample = async () => {
    if (!provider) {
      console.error('You need to connect to your wallet first');
      return;
    }

    if (!alice || !bob) {
      console.error('You need to create Alice and Bob');
      return;
    }

    const remoteBob = makeRemoteBob(bob);
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

    const policy = await alice.grant(
      provider,
      provider.getSigner(),
      getPorterUri('tapir'), // Testnet porter
      policyParams,
    );

    console.log('Policy created');
    setPolicy(policy);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="stack left">
          <div>
            <div>Create Alice and Bob</div>
            <button onClick={() => makeCharacters()}>Go</button>
            <div>
              {alice && (
                <span>
                  Alice:{' '}
                  {`0x${toHexString(alice.verifyingKey.toCompressedBytes())}`}
                </span>
              )}
            </div>
            <div>
              {bob && (
                <span>
                  Bob:{' '}
                  {`0x${toHexString(bob.verifyingKey.toCompressedBytes())}`}
                </span>
              )}
            </div>
          </div>

          {alice && bob && (
            <div>
              <div>Create a policy</div>
              <button onClick={() => runExample()}>Go</button>
            </div>
          )}

          {policy && (
            <div>
              <div>
                Policy id: <div>{toHexString(policy.id.toBytes())}</div>
              </div>
              <div>
                Policy: <div>{JSON.stringify(policy)}</div>
              </div>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;
