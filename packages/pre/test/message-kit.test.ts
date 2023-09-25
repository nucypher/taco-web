import { fakeBob } from '@nucypher/test-utils';
import { expect, test } from 'vitest';

import { MessageKit, toBytes } from '../src';

test('message kit', () => {
  test('bob decrypts', () => {
    const bob = fakeBob();
    const plaintext = toBytes('fake-message');
    const messageKit = new MessageKit(bob.decryptingKey, plaintext, null);
    const decrypted = bob['keyring'].decrypt(messageKit);
    expect(decrypted).toBeTruthy();
  });
});
