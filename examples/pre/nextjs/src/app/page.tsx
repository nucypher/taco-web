'use client';
import {
  Alice,
  Bob,
  domains,
  EnactedPolicy,
  getPorterUri,
  initialize,
  SecretKey,
  toHexString,
} from '@nucypher/pre';
import { useEffect, useState } from 'react';
import { createWalletClient, custom, toHex, WalletClient } from 'viem';
import 'viem/window';

function App() {
  const [isInit, setIsInit] = useState<boolean>(false);
  const [walletClient, setWalletClient] = useState<WalletClient | undefined>();
  const [alice, setAlice] = useState<Alice | undefined>();
  const [bob, setBob] = useState<Bob | undefined>();
  const [policy, setPolicy] = useState<EnactedPolicy>();

  const initNucypher = async () => {
    await initialize();
    setIsInit(true);
  };

  const loadWalletClient = async () => {
    if (!window.ethereum) {
      console.error('You need to connect to your wallet first');
      return;
    }
    const walletClient = createWalletClient({
      transport: custom(window.ethereum),
    });
    const chainId = await walletClient.getChainId();
    const mumbaiChainId = 80001;
    if (chainId !== mumbaiChainId) {
      // Switch to Polygon Mumbai testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: toHex(mumbaiChainId) }],
      });
    }

    setWalletClient(walletClient);
  };

  useEffect(() => {
    initNucypher();
    loadWalletClient();
  }, []);

  if (!isInit || !walletClient) {
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
    const { decryptingKey, verifyingKey } = bob;
    return { decryptingKey, verifyingKey };
  };

  const makeCharacters = () => {
    makeAlice();
    makeBob();
  };

  const getRandomLabel = () => `label-${new Date().getTime()}`;

  const runExample = async () => {
    if (!walletClient) {
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
      walletClient,
      domains.TESTNET,
      getPorterUri(domains.TESTNET),
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
