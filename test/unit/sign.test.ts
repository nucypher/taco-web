import { verifySignature } from '../../src/crypto/api';
import { toBytes } from '../../src/utils';
import { mockAlice } from '../utils';

describe('alice', () => {
  it('signs and verifies signature', async () => {
    const alice = mockAlice();
    const message = toBytes('fake-message');
    const signature = alice.signer.sign(message).toBytes();
    expect(verifySignature(signature, message, alice.verifyingKey)).toBeTruthy();
  });
});
