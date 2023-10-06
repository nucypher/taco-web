import { ThresholdMessageKit } from '@nucypher/taco';
import React, { useState } from 'react';

interface Props {
  enabled: boolean;
  decrypt: (encryptedMessage: ThresholdMessageKit) => void;
  decryptedMessage?: string | undefined;
  decryptionErrors: string[];
}

export const Decrypt = ({
  decrypt,
  decryptedMessage,
  decryptionErrors,
  enabled,
}: Props) => {
  const [encryptedMessage, setEncryptedMessage] = useState('');

  if (!enabled) {
    return <></>;
  }

  const onDecrypt = () => {
    if (!encryptedMessage) {
      return;
    }
    const mkBytes = Buffer.from(encryptedMessage, 'base64');
    const mk = ThresholdMessageKit.fromBytes(mkBytes);
    decrypt(mk);
  };

  const DecryptedMessage = () => {
    if (!decryptedMessage) {
      return <></>;
    }
    return (
      <>
        <h3>Decrypted Message:</h3>
        <p>{decryptedMessage}</p>
      </>
    );
  };

  const DecryptionErrors = () => {
    if (decryptionErrors.length === 0) {
      return null;
    }

    return (
      <div>
        <h2>Decryption Errors</h2>
        <p>Not enough decryption shares to decrypt the message.</p>
        <p>Some Ursulas have failed with errors:</p>
        <ul>
          {decryptionErrors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div>
      <h2>Step 3 - Decrypt Encrypted Message</h2>
      <input
        value={encryptedMessage}
        placeholder="Enter encrypted message"
        onChange={(e) => setEncryptedMessage(e.currentTarget.value)}
      />
      <button onClick={onDecrypt}>Decrypt</button>
      {DecryptedMessage()}
      {DecryptionErrors()}
    </div>
  );
};
