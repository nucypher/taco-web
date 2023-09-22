import { MessageKit, toBytes } from '@nucypher/shared';
import { fakeBob } from '@nucypher/test-utils';
import { expect, test } from 'vitest';

test('message kit', () => {
  test('bob decrypts', () => {
    const bob = fakeBob();
    const plaintext = toBytes('fake-message');
    const messageKit = new MessageKit(bob.decryptingKey, plaintext, null);
    const decrypted = bob['keyring'].decrypt(messageKit);
    expect(decrypted).toBeTruthy();
  });
});
