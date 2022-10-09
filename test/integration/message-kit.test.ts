import { MessageKit } from '../../src';
import { toBytes } from '../../src/utils';
import { mockBob } from '../utils';

describe('message kit', () => {
  it('bob decrypts', () => {
    const bob = mockBob();
    const plaintext = toBytes('fake-message');
    const messageKit = new MessageKit(bob.decryptingKey, plaintext, null);
    const decrypted = bob['keyring'].decrypt(messageKit);
    expect(decrypted).toBeTruthy();
  });
});
