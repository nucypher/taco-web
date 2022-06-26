import { makeTDecDecrypter, makeTDecEncrypter } from '../../src/characters/tDec';
import { toBytes } from '../../src/utils';

describe('threshold decryption', () => {
  const plaintext = toBytes('plaintext-message');

  it('encrypts and decrypts reencrypted message', async () => {
    const encrypter = makeTDecEncrypter("simple");
    const decrypter = makeTDecDecrypter("simple", "https://porter-ibex.nucypher.community")
    const encryptedMessageKit = encrypter.encryptMessage(plaintext);

    const bobPlaintext = decrypter.retrieveAndDecrypt([encryptedMessageKit]);
    expect(bobPlaintext).toEqual(plaintext);
  });
});
