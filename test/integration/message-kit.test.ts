import { MessageKit } from '../../src';
import { toBytes } from '../../src/utils';
import { mockBob } from '../utils';

describe('message kit', () => {
  it('bob decrypts', () => {
    const bob = mockBob();
    const plaintext = toBytes('fake-message');

    const messageKit = MessageKit.author(
      bob.decryptingKey,
      plaintext,
    );

    const decrypted = (bob as any).decryptingPower.decrypt(messageKit);
    expect(decrypted).toBeTruthy();
  });
});
