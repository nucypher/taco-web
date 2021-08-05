import { mockAlice, mockBob } from '../utils';
import { encryptAndSign, verifySignature } from '../../src/crypto/api';

describe('encrypt decrypt', () => {
  it('alice encrypts and signs plaintext', () => {
    const alice = mockAlice();
    const bob = mockBob();
    const plaintext = Buffer.from('fake-message');

    const messageKit = encryptAndSign(
      bob.encryptingPublicKey,
      plaintext,
      alice.signer,
      alice.verifyingKey
    );

    expect(
      verifySignature(messageKit.signature!, plaintext, alice.verifyingKey)
    ).toBeTruthy();
    expect((bob as any).decryptingPower.decrypt(messageKit)).toBeTruthy();
  });

  it('alice encrypts for bob and signs plaintext', () => {
    const alice = mockAlice();
    const bob = mockBob();
    const message = Buffer.from('fake-message');

    const messageKit = alice.encryptFor(bob.encryptingPublicKey, message);
    const cleartext = bob.verifyFrom(alice.verifyingKey, messageKit, true);

    expect(cleartext).toEqual(message);
  });
});
