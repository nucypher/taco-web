import {
  makeTDecDecrypter,
  makeTDecEncrypter,
  generateTDecEntities,
} from '../../src/characters/tDec';
import { toBytes } from '../../src/utils';
import {
  mockWeb3Provider,
} from '../utils';
import { ethers } from 'ethers';
import { SecretKey } from '@nucypher/nucypher-core';

describe('threshold decryption', () => {
  const plaintext = toBytes('plaintext-message');

  it('encrypts and decrypts reencrypted message from static config', async () => {
    const encrypter = await makeTDecEncrypter('james-ibex');
    const decrypter = await makeTDecDecrypter(
      'james-ibex',
      'https://porter-ibex.nucypher.community'
    );
    const encryptedMessageKit = encrypter.encryptMessage(plaintext);

    const bobPlaintext = await decrypter.retrieveAndDecrypt([
      encryptedMessageKit,
    ]);
    expect(bobPlaintext[0]).toEqual(plaintext);
  });

  it('encrypts and decrypts reencrypted message from dynamic config', async () => {
    const secretKey = SecretKey.random()
    const provider = mockWeb3Provider(secretKey.toSecretBytes());
    const startDate = new Date();
    const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // In 30 days

    let [encrypter, decrypter, policy] = await generateTDecEntities(
      3,
      5,
      provider as ethers.providers.Web3Provider,
      'test',
      startDate,
      endDate,
      'https://porter-ibex.nucypher.community',
      secretKey
    );
    const encryptedMessageKit = encrypter.encryptMessage(plaintext);

    const bobPlaintext = await decrypter.retrieveAndDecrypt([
      encryptedMessageKit,
    ]);
    expect(bobPlaintext[0]).toEqual(plaintext);
  });
});
