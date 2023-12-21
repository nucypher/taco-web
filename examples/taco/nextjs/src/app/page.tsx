'use client';
import { fromHexString } from '@nucypher/shared';
import { conditions, domains, fromBytes, toHexString } from '@nucypher/taco';
import { useEffect, useState } from 'react';
import 'viem/window';
import {
  createPublicClient,
  createWalletClient,
  custom,
  PublicClient,
  toHex,
  WalletClient,
} from 'viem';

import useTaco from '../hooks/useTaco';

const ritualId = 5; // Replace with your own ritual ID
const domain = domains.TESTNET;

function App() {
  const [walletClient, setWalletClient] = useState<WalletClient | undefined>();
  const [publicClient, setPublicClient] = useState<PublicClient | undefined>();
  const [message, setMessage] = useState('this is a secret');
  const [encrypting, setEncrypting] = useState(false);
  const [encryptedText, setEncryptedText] = useState<string | undefined>('');
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedMessage, setDecryptedMessage] = useState<string | undefined>(
    '',
  );

  const loadWeb3Provider = async () => {
    if (!window.ethereum) {
      console.error('You need to connect to your wallet first');
      return;
    }

    const publicClient = createPublicClient({
      transport: custom(window.ethereum),
    });
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
    setPublicClient(publicClient);
  };

  useEffect(() => {
    loadWeb3Provider();
  }, []);

  const { isInit, encryptDataToBytes, decryptDataFromBytes } = useTaco({
    domain,
    ritualId,
    walletClient,
    publicClient,
  });

  if (!isInit || !walletClient) {
    return <div>Loading...</div>;
  }

  const encryptMessage = async () => {
    if (!walletClient) {
      return;
    }
    setEncrypting(true);
    try {
      const hasPositiveBalance = new conditions.RpcCondition({
        chain: 80001,
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: {
          comparator: '>',
          value: 0,
        },
      });

      console.log('Encrypting message...');
      const encryptedBytes = await encryptDataToBytes(
        message,
        hasPositiveBalance,
        publicClient,
        walletClient,
      );
      if (encryptedBytes) {
        setEncryptedText(toHexString(encryptedBytes));
      }
    } catch (e) {
      console.log(e);
    }
    setEncrypting(false);
  };

  const decryptMessage = async () => {
    if (!encryptedText || !walletClient || !publicClient) {
      return;
    }
    try {
      setDecrypting(true);
      console.log('Decrypting message...');
      const decryptedMessage = await decryptDataFromBytes(
        fromHexString(encryptedText),
        publicClient,
        walletClient,
      );
      if (decryptedMessage) {
        setDecryptedMessage(fromBytes(decryptedMessage));
      }
    } catch (e) {
      console.log(e);
    }
    setDecrypting(false);
  };

  return (
    <div>
      <h2>
        Secret message:{' '}
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onClick={encryptMessage}
        />
        <button onClick={encryptMessage}>Encrypt</button>
        {encrypting && 'Encrypting...'}
      </h2>
      <h2>
        Encrypted message:{' '}
        <input
          value={encryptedText}
          onChange={(e) => setEncryptedText(e.target.value)}
        />
        <button onClick={decryptMessage}>Decrypt</button>
        {decrypting && 'Decrypting...'}
      </h2>
      {decryptedMessage && <h2>Decrypted message: {decryptedMessage}</h2>}
    </div>
  );
}

export default App;
