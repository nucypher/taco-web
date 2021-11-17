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
});
