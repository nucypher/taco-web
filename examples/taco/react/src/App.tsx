import {
  conditions,
  decrypt,
  encrypt,
  getPorterUri,
  initialize,
  toBytes,
} from '@nucypher/taco';
import {ethers} from 'ethers';
import {useEffect, useState} from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

function App() {
  const [isInit, setIsInit] = useState<boolean>(false);
  const [provider, setProvider] = useState<
    ethers.providers.Web3Provider | undefined
  >();

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

  const runExample = async () => {
    if (!window.ethereum) {
      console.error('You need to connect to the MetaMask extension');
    }

    await initialize();

    alert('Sign a transaction to create a policy.');

    const provider = new ethers.providers.Web3Provider(window.ethereum!, 'any');
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();

    const {chainId} = await provider.getNetwork();
    if (chainId !== 80001) {
      // Switch to Matic Mumbai testnet
      await window.ethereum!.request!({
        method: 'wallet_switchEthereumChain',
        params: [{chainId: '0x13881'}],
      });
    }

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

    console.log('Decrypted message:', decryptedMessage);
    if (decryptedMessage === message) {
      console.log('Success!');
    } else {
      console.log('Failed to decrypt message');
    }
  };

  return (
    <div>
      <button onClick={runExample}>Run example</button>
    </div>
  );
}

export default App;
