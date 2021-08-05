import { verifySignature } from '../../src/crypto/api';
import { mockAlice } from '../utils';

describe('alice', () => {
  it('signs and verifies signature', async () => {
    const alice = mockAlice();

    const message = Buffer.from('fake-message');
    const signature = Buffer.from(alice.signer.sign(message).toBytes());
    expect(
      verifySignature(signature, message, alice.verifyingKey)
    ).toBeTruthy();
  });
});
