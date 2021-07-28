import { encryptAndSign, verifySignature } from '../../src/crypto/api';
import { toBytes } from '../../src/utils';
import { mockAlice, mockBob } from '../utils';

describe('encrypt decrypt', () => {
  it('alice encrypts and signs plaintext', () => {
    const alice = mockAlice();
    const bob = mockBob();
    const plaintext = toBytes('fake-message');

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
    const message = toBytes('fake-message');

    const messageKit = alice.encryptFor(bob.encryptingPublicKey, message);
    const cleartext = bob.verifyFrom(alice.verifyingKey, messageKit, true);

    expect(cleartext).toEqual(message);
  });
});
