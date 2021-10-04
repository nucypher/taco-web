import { MessageKit } from '../../src';
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

    const isValid = messageKit.signature!.verify(alice.verifyingKey, plaintext);
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
