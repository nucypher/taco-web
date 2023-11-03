import {
  conditions,
  decrypt,
  domains,
  encrypt,
  fromBytes,
  getPorterUri,
  initialize,
} from '@nucypher/taco';
import { ethers } from 'ethers';
import { hexlify } from "ethers/lib/utils";
import { useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

const message = 'this is a secret';

function App() {
  const [isInit, setIsInit] = useState(false);
  const [provider, setProvider] = useState<
    ethers.providers.Web3Provider | undefined
  >();
  const [decryptedMessage, setDecryptedMessage] = useState<string | undefined>(
    '',
  );

  const initNucypher = async () => {
    await initialize();
    setIsInit(true);
  };

  const loadWeb3Provider = async () => {
    if (!window.ethereum) {
      console.error('You need to connect to your wallet first');
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');

    const { chainId } = await provider.getNetwork();
    const mumbaiChainId = 80001;
    if (chainId !== mumbaiChainId) {
      // Switch to Polygon Mumbai testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexlify(mumbaiChainId) }],
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

  const runExample = async () => {
    if (!window.ethereum) {
      console.error('You need to connect to your wallet first');
    }

    await initialize();

    const provider = new ethers.providers.Web3Provider(window.ethereum!, 'any');
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();

    console.log('Encrypting message...');
    const hasPositiveBalance = new conditions.RpcCondition({
      chain: 80001,
      method: 'eth_getBalance',
      parameters: [':userAddress', 'latest'],
      returnValueTest: {
        index: 0,
        comparator: '>',
        value: 0,
      },
    });
    const ritualId = 5; // Replace with your own ritual ID
    const messageKit = await encrypt(
      provider,
      domains.TESTNET,
      message,
      hasPositiveBalance,
      ritualId,
      signer,
    );

    console.log('Decrypting message...');
    const decryptedMessage = await decrypt(
      provider,
      domains.TESTNET,
      messageKit,
      getPorterUri(domains.TESTNET),
      signer,
    );

    setDecryptedMessage(fromBytes(decryptedMessage));
  };

  return (
    <div>
      <h1>Secret message: {message}</h1>
      {decryptedMessage && <h1>Decrypted message: {decryptedMessage}</h1>}
      <button onClick={runExample}>Run example</button>
    </div>
  );
}

export default App;
