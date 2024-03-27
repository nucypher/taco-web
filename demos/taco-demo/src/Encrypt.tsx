import React, { useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

interface Props {
  enabled: boolean;
  encryptedMessageId?: string;
  encrypt: (value: string) => void;
}

export const Encrypt = ({ encrypt, encryptedMessageId, enabled }: Props) => {
  if (!enabled) {
    return <></>;
  }

  const [plaintext, setPlaintext] = useState('plaintext');

  const onClick = () => encrypt(plaintext);

  const EncryptedMessageIdContent = () => {
    if (!encryptedMessageId) {
      return <></>;
    }

    return (
      <>
        <div>
          <h3>Encrypted message id:</h3>
          <pre className="encryptedMessageId">{encryptedMessageId}</pre>
          <CopyToClipboard text={encryptedMessageId}>
            <button>Copy to clipboard</button>
          </CopyToClipboard>
        </div>
      </>
    );
  };

  return (
    <div>
      <h2>Step 2 - Set conditions and Encrypt a message</h2>
      <input
        type="string"
        value={plaintext}
        onChange={(e) => setPlaintext(e.currentTarget.value)}
      />
      <button onClick={onClick}>Encrypt</button>
      {EncryptedMessageIdContent()}
    </div>
  );
};
