import {
  conditions,
  decrypt,
  domains,
  encrypt,
  getPorterUri,
  initialize,
  ThresholdMessageKit,
} from '@nucypher/taco';
import { Mumbai, useEthers } from '@usedapp/core';
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';

import { ConditionBuilder } from './ConditionBuilder';
import { Decrypt } from './Decrypt';
import { Encrypt } from './Encrypt';
import { Spinner } from './Spinner';

export default function App() {
  const { activateBrowserWallet, deactivate, account, switchNetwork } =
    useEthers();

  const [loading, setLoading] = useState(false);
  const [condition, setCondition] = useState<conditions.Condition>();
  const [encryptedMessage, setEncryptedMessage] =
    useState<ThresholdMessageKit>();
  const [decryptedMessage, setDecryptedMessage] = useState<string>();
  const [decryptionErrors, setDecryptionErrors] = useState<string[]>([]);
  const [ritualId, setRitualId] = useState<number>(2);

  useEffect(() => {
    initialize();
    switchNetwork(Mumbai.chainId);
  }, []);

  const encryptMessage = async (message: string) => {
    if (!condition) {
      return;
    }
    setLoading(true);

    await switchNetwork(Mumbai.chainId);

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const encryptedMessage = await encrypt(
      provider,
      domains.TESTNET,
      message,
      condition,
      ritualId,
      provider.getSigner(),
    );

    setEncryptedMessage(encryptedMessage);
    setLoading(false);
  };

  const decryptMessage = async (encryptedMessage: ThresholdMessageKit) => {
    if (!condition) {
      return;
    }
    setLoading(true);
    setDecryptedMessage('');
    setDecryptionErrors([]);

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const decryptedMessage = await decrypt(
      provider,
      domains.TESTNET,
      encryptedMessage,
      getPorterUri(domains.TESTNET),
      provider.getSigner(),
    );

    setDecryptedMessage(new TextDecoder().decode(decryptedMessage));
    setLoading(false);
  };

  if (!account) {
    return (
      <div>
        <h2>Web3 Provider</h2>
        <button onClick={() => activateBrowserWallet()}>Connect Wallet</button>
      </div>
    );
  }

  if (loading) {
    return <Spinner loading={loading} />;
  }

  return (
    <div>
      <div>
        <h2>Web3 Provider</h2>
        <button onClick={deactivate}> Disconnect Wallet</button>
        {account && <p>Account: {account}</p>}
      </div>

      <h2>Ritual ID</h2>
      <p>Replace with your own ritual ID</p>
      <input type={'number'} value={ritualId} onChange={(e) => setRitualId(parseInt(e.currentTarget.value))} />

      <ConditionBuilder
        enabled={true}
        condition={condition}
        setConditions={setCondition}
      />

      <Encrypt
        enabled={!!condition}
        encrypt={encryptMessage}
        encryptedMessage={encryptedMessage!}
      />

      <Decrypt
        enabled={!!encryptedMessage}
        decrypt={decryptMessage}
        decryptedMessage={decryptedMessage}
        decryptionErrors={decryptionErrors}
      />
    </div>
  );
}
