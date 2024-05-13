import {
  conditions,
  decrypt,
  domains,
  encrypt,
  getPorterUri,
  initialize,
  ThresholdMessageKit,
  toHexString,
} from '@nucypher/taco';
import { useEthers } from '@usedapp/core';
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';

import { ConditionBuilder } from './ConditionBuilder';
import { Decrypt } from './Decrypt';
import { Encrypt } from './Encrypt';
import { Spinner } from './Spinner';
import { DEFAULT_DOMAIN, DEFAULT_RITUAL_ID } from './config';
import { downloadData, getWebIrys, uploadData } from './irys';

const chainIdForDomain = {
  [domains.DEVNET]: 80002,
  [domains.TESTNET]: 80002,
  [domains.MAINNET]: 137,
};

export default function App() {
  const { activateBrowserWallet, deactivate, account, switchNetwork } =
    useEthers();

  const [loading, setLoading] = useState(false);
  const [condition, setCondition] = useState<conditions.condition.Condition>();
  const [encryptedMessageId, setEncryptedMessageIdId] = useState<string>();
  const [decryptedMessage, setDecryptedMessage] = useState<string>();
  const [decryptionErrors, setDecryptionErrors] = useState<string[]>([]);
  const [ritualId, setRitualId] = useState<number>(DEFAULT_RITUAL_ID);
  const [domain, setDomain] = useState<string>(DEFAULT_DOMAIN);

  const chainId = chainIdForDomain[domain];
  const provider = new ethers.providers.Web3Provider(window.ethereum);

  useEffect(() => {
    initialize();
    switchNetwork(chainId);
  }, [chainId]);

  const encryptMessage = async (message: string) => {
    if (!condition) {
      return;
    }
    setLoading(true);

    await switchNetwork(chainId);

    const encryptedMessage = await encrypt(
      provider,
      domain,
      message,
      condition,
      ritualId,
      provider.getSigner(),
    );

    const encryptedMessageHex = toHexString(encryptedMessage.toBytes());
    const webIrys = await getWebIrys(provider);
    const receiptId = await uploadData(webIrys, encryptedMessageHex);

    setEncryptedMessageIdId(receiptId);
    setLoading(false);
  };

  const decryptMessage = async (encryptedMessageId: string) => {
    if (!condition) {
      return;
    }
    setLoading(true);
    setDecryptedMessage('');
    setDecryptionErrors([]);

    const encryptedMessageHex = await downloadData(encryptedMessageId) as string;
    const encryptedMessage = ThresholdMessageKit.fromBytes(
      Buffer.from(encryptedMessageHex, 'hex'),
    );

    const decryptedMessage = await decrypt(
      provider,
      domain,
      encryptedMessage,
      getPorterUri(domain),
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

      <h2>Notice</h2>
      <p>
        In production (mainnet domain), your wallet address (encryptor) will also have
        to be allow-listed for this specific ritual. However, we have 
        <a href={'https://docs.threshold.network/app-development/threshold-access-control-tac/integration-guide/get-started-with-tac#testnet-configuration'}>publicly available testnet rituals</a>
        for use when developing your apps.
      </p>
      <p>
        Connect with us on our{' '}
        <a href={'https://discord.gg/threshold'}>Discord server</a> for more info!
      </p>

      <h2>Ritual ID</h2>
      <p>Replace with your own ritual ID</p>
      <input
        type={'number'}
        value={ritualId}
        onChange={(e) => setRitualId(parseInt(e.currentTarget.value))}
      />

      <h2>TACo Domain</h2>
      <p>Must match the domain of your ritual</p>
      <select
        defaultValue={domain}
        onChange={(e) => setDomain(e.currentTarget.value)}
      >
        {Object.values(domains).map((domain) => (
          <option value={domain} key={domain}>
            {domain}
          </option>
        ))}
      </select>

      <ConditionBuilder
        enabled={true}
        condition={condition}
        setConditions={setCondition}
      />

      <Encrypt
        enabled={!!condition}
        encrypt={encryptMessage}
        encryptedMessageId={encryptedMessageId!}
      />

      <Decrypt
        enabled={!!encryptedMessageId}
        decrypt={decryptMessage}
        decryptedMessage={decryptedMessage}
        decryptionErrors={decryptionErrors}
      />
    </div>
  );
}
