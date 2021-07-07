import { decryptOriginal } from 'umbral-pre';

import { Enrico } from '../../src';
import { mockAlice, mockBob, reencryptKFrags } from '../utils';

describe('enrico', () => {
  it('alice decrypts message encrypted by enrico', async () => {
    const label = 'fake-label';
    const message = 'fake-message';
    const alice = mockAlice();

    const policyPublicKey = await alice.getPolicyEncryptingKeyFromLabel(label);
    const enrico = new Enrico(policyPublicKey);
    const { capsule, ciphertext } = enrico.encrypt(Buffer.from(message));

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
      label
    );

    const plaintext = 'Plaintext message';
    const plaintextBytes = Buffer.from(plaintext);

    const enrico = new Enrico(policyEncryptingKey);
    const encrypted = enrico.encrypt(plaintextBytes);
    const { ciphertext, capsule, signature } = encrypted;

    // Alice can decrypt capsule she created
    const aliceSk = await (alice as any).delegatingPower.getSecretKeyFromLabel(
      label
    );
    const plaintextAlice = decryptOriginal(aliceSk, capsule, ciphertext);
    expect(
      Buffer.from(plaintextAlice)
        .toString('utf-8')
        .endsWith(plaintext)
    ).toBeTruthy();

    const n = 3;
    const m = 2;
    const { kFrags, delegatingPublicKey } = await alice.generateKFrags(
      bob,
      label,
      m,
      n
    );
    expect(delegatingPublicKey.toBytes()).toEqual(
      policyEncryptingKey.toBytes()
    );

    const capsuleWithFrags = reencryptKFrags(kFrags.slice(0, m), capsule);

    // Bob can decrypt re-encrypted ciphertext
    const bobSk = (bob as any).decryptingPower.secretKey;
    const plaintextBob = capsuleWithFrags.decryptReencrypted(
      bobSk,
      policyEncryptingKey,
      ciphertext
    );
    expect(
      Buffer.from(plaintextBob)
        .toString('utf-8')
        .endsWith(plaintext)
    ).toBeTruthy();

    // Bob can decrypt ciphertext and verify origin of the message
    const isValid = bob.verifyFrom(
      enrico.verifyingKey, // Message was signed off by Enrico
      {
        ciphertext,
        capsule: capsuleWithFrags,
        senderVerifyingKey: enrico.verifyingKey, // Message was signed off by Enrico
        recipientEncryptingKey: policyEncryptingKey, // Message was encrypted using key derived by Alice
        signature,
      },
      true
    );
    expect(isValid).toBeTruthy();
  });
});
