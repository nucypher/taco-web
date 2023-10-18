import { beforeAll, describe, expect, it } from 'vitest';

import { initialize, MessageKit, toBytes } from '../src';

import { fakeBob } from './utils';

describe('message kit', () => {
  beforeAll(async () => {
    await initialize();
  });

  it('bob decrypts', () => {
    const bob = fakeBob();
    const plaintext = toBytes('fake-message');
    const messageKit = new MessageKit(bob.decryptingKey, plaintext, null);
    const decrypted = bob['keyring'].decrypt(messageKit);
    expect(decrypted).toBeTruthy();
  });
});
