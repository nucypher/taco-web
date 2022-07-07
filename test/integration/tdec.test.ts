import { makeTDecDecrypter, makeTDecEncrypter } from '../../src/characters/tDec';
import { toBytes } from '../../src/utils';

describe('threshold decryption', () => {
  const plaintext = toBytes('plaintext-message');

  it('encrypts and decrypts reencrypted message', async () => {
    const encrypter = await makeTDecEncrypter("james-ibex");
    const decrypter = await makeTDecDecrypter("james-ibex", "https://porter-ibex.nucypher.community")
    const encryptedMessageKit = encrypter.encryptMessage(plaintext);

    const bobPlaintext = await decrypter.retrieveAndDecrypt([encryptedMessageKit]);
    expect(bobPlaintext[0]).toEqual(plaintext);
  });
});
