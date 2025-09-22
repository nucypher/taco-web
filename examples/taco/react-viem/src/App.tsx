import { fromHexString } from '@nucypher/shared';
import { conditions, domains, fromBytes, toHexString } from '@nucypher/taco';
import { hexlify } from 'ethers/lib/utils';
import { useEffect, useState } from 'react';
import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  PublicClient,
  WalletClient
} from 'viem';
import { polygonAmoy } from 'viem/chains';

import useTaco from './hooks/useTaco';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

const ritualId = 6; // Replace with your own ritual ID
const domain = domains.TESTNET;

function App() {
  const [publicClient, setPublicClient] = useState<PublicClient>();
  const [walletClient, setWalletClient] = useState<WalletClient>();
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
 
    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });
 
    // Create public client for reading data
    const publicClient = createPublicClient({
      chain: polygonAmoy,
      transport: custom(window.ethereum),
    });

    // Get the accounts from the provider
    const [account] = await window.ethereum.request({
      method: 'eth_accounts'
    });
    // Create wallet client for signing the message
    const walletClient = createWalletClient({
      account,
      chain: polygonAmoy,
      transport: custom(window.ethereum),
    });

    const chainId = await publicClient.getChainId();
    const amoyChainId = 80002;
    if (chainId !== amoyChainId) {
      // Switch to Polygon Amoy testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexlify(amoyChainId) }],
      });
    }

    setPublicClient(publicClient);
    setWalletClient(walletClient);
  };

  useEffect(() => {
    loadWeb3Provider();
  }, []);

  const { isInit, encryptDataToBytes, decryptDataFromBytes } = useTaco({
    domain,
    publicClient,
    walletClient,
    ritualId,
  });

  if (!isInit || !publicClient || !walletClient) {
    return <div>Loading...</div>;
  }

  const encryptMessage = async () => {
    if (!walletClient) {
      return;
    }
    setEncrypting(true);
    try {
      const hasPositiveBalance = new conditions.base.rpc.RpcCondition({
        chain: 80002,
        method: 'eth_getBalance',
        parameters: [':userAddress', 'latest'],
        returnValueTest: {
          comparator: '>=',
          value: 0,
        },
      });

      console.log('Encrypting message...');
      const encryptedBytes = await encryptDataToBytes(
        message,
        hasPositiveBalance,
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
    if (!encryptedText || !walletClient) {
      return;
    }
    try {
      setDecrypting(true);

      console.log('Decrypting message...');
      const decryptedMessage = await decryptDataFromBytes(
        fromHexString(encryptedText),
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
        />{' '}
        <button onClick={encryptMessage}>Encrypt</button>{' '}
        {encrypting && 'Encrypting...'}
      </h2>
      <h2>
        Encrypted message:{' '}
        <input
          value={encryptedText}
          onChange={(e) => setEncryptedText(e.target.value)}
        />{' '}
        <button onClick={decryptMessage}>Decrypt</button>{' '}
        {decrypting && 'Decrypting...'}
      </h2>
      {decryptedMessage && <h2>Decrypted message: {decryptedMessage}</h2>}
    </div>
  );
}

export default App;
