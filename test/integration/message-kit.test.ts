import { verifySignature } from '../../src/crypto/api';
import { MessageKit } from '../../src/kits/message';
import { toBytes } from '../../src/utils';
import { mockAlice, mockBob } from '../utils';

describe('message kit', () => {
  it('alice encrypts and signs plaintext', () => {
    const alice = mockAlice();
    const bob = mockBob();
    const plaintext = toBytes('fake-message');

    const messageKit = MessageKit.author(
      bob.decryptingKey,
      plaintext,
      alice.signer,
    );

    const isValid = verifySignature(messageKit.signature!, plaintext, alice.verifyingKey);
    expect(isValid).toBeTruthy();
    const decrypted = (bob as any).decryptingPower.decrypt(messageKit);
    expect(decrypted).toBeTruthy();
  });

  it('alice encrypts for bob and signs plaintext', () => {
    const alice = mockAlice();
    const bob = mockBob();
    const message = toBytes('fake-message');

    const messageKit = alice.encryptFor(bob.decryptingKey, message);
    const cleartext = bob.verifyFrom(alice.verifyingKey, messageKit);

    expect(cleartext).toEqual(message);
  });
});
