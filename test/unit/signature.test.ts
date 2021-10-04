import { SecretKey } from 'umbral-pre';

import { Enrico } from '../../src';
import { toBytes } from '../../src/utils';
import { mockAlice, mockBob } from '../utils';

const setup = () => {
  const alice = mockAlice();
  const plaintext = toBytes('fake-message');
  const bob = mockBob();
  const enrico = new Enrico(bob.decryptingKey);
  const encrypted = enrico.encryptMessage(plaintext);
  return { alice, plaintext, bob, enrico, encrypted };
};

describe('signature', () => {

  it('verifies signature', () => {
    const { alice, plaintext } = setup();
    const signature = alice.signer.sign(plaintext);
    expect(signature.verify(alice.verifyingKey, plaintext)).toBeTruthy();
  });

  it('throws on invalid signer', () => {
    const { bob, encrypted } = setup();
    const invalidSigner = SecretKey.random().publicKey();
    const t = () => bob.verifyFrom(
      invalidSigner,
      encrypted,
    );
    expect(t).toThrow(new Error(`This message kit doesn't appear to have come from ${invalidSigner.toString()}`));
  });

  it('verifies signature signer', async () => {
    const { plaintext, bob, enrico, encrypted } = setup();
    const decrypted = bob.verifyFrom(
      enrico.verifyingKey,
      encrypted,
    );
    expect(decrypted).toEqual(plaintext);
  });
});
