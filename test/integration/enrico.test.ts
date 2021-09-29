import { decryptOriginal } from 'umbral-pre';

import { Enrico, PolicyMessageKit } from '../../src';
import { RetrievalResult } from '../../src/kits/retrieval';
import { fromBytes, toBytes } from '../../src/utils';
import { mockAlice, mockBob, reencryptKFrags } from '../utils';

describe('enrico', () => {
  it('alice decrypts message encrypted by enrico', async () => {
    const label = 'fake-label';
    const message = 'fake-message';
    const alice = mockAlice();

    const policyKey = await alice.getPolicyEncryptingKeyFromLabel(label);
    const enrico = new Enrico(policyKey);
    const { capsule, ciphertext } = enrico.encryptMessage(toBytes(message));

    const alicePower = (alice as any).delegatingPower;
    const aliceSk = await alicePower.getSecretKeyFromLabel(label);
    const alicePlaintext = decryptOriginal(aliceSk, capsule, ciphertext);
    expect(alicePlaintext).toEqual(alicePlaintext);
  });

  it('bob decrypts reencrypted message', async () => {
    const label = 'fake-label';
    const alice = mockAlice();
    const bob = mockBob();

    const policyEncryptingKey = await alice.getPolicyEncryptingKeyFromLabel(
      label,
    );
    const enrico = new Enrico(policyEncryptingKey);

    const plaintext = 'Plaintext message';
    const plaintextBytes = toBytes(plaintext);
    const encrypted = enrico.encryptMessage(plaintextBytes);
    const { ciphertext, capsule } = encrypted;

    // Alice can decrypt capsule she created
    const aliceSk = await (alice as any).delegatingPower.getSecretKeyFromLabel(
      label,
    );
    const plaintextAlice = decryptOriginal(aliceSk, capsule, ciphertext);
    expect(fromBytes(plaintextAlice).endsWith(plaintext)).toBeTruthy();

    const threshold = 2;
    const shares = 3;
    const { verifiedKFrags, delegatingKey } = await alice.generateKFrags(
      bob,
      label,
      threshold,
      shares,
    );
    expect(delegatingKey.toBytes()).toEqual(
      policyEncryptingKey.toBytes(),
    );

    const { capsuleWithFrags, verifiedCFrags } = reencryptKFrags(
      verifiedKFrags,
      capsule,
    );

    // Bob can decrypt re-encrypted ciphertext
    const bobSk = (bob as any).decryptingPower.secretKey;
    const plaintextBob = capsuleWithFrags.decryptReencrypted(
      bobSk,
      policyEncryptingKey,
      ciphertext,
    );
    expect(fromBytes(plaintextBob).endsWith(plaintext)).toBeTruthy();

    // Bob can decrypt ciphertext and verify origin of the message
    const cFragsWithUrsulas = verifiedCFrags.map((cFrag, index) => ([ `0x${index}`, cFrag ]));
    const result = new RetrievalResult(Object.fromEntries(cFragsWithUrsulas));
    const pk = PolicyMessageKit
      .fromMessageKit(encrypted, policyEncryptingKey, threshold)
      .withResult(result);

    const isValid = bob.verifyFrom(
      enrico.verifyingKey, // Message was signed off by Enrico
      pk,
    );
    expect(isValid).toBeTruthy();
  });
});
