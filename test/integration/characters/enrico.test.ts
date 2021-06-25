import * as umbral from 'umbral-pre';

import { Enrico } from '../../../src';
import { mockAlice, mockBob, reencryptKFrags } from '../../utils';

describe('enrico', () => {
  it('alice decrypts message encrypted by enrico', async () => {
    const label = 'fake-label';
    const message = 'fake-message';
    const alice = mockAlice();

    const policyPublicKey = await alice.getPolicyEncryptingKeyFromLabel(label);
    const enrico = new Enrico(policyPublicKey);
    const { capsule, ciphertext } = enrico.encrypt(Buffer.from(message));

    // TODO: Can't verify signature signed with public key using umbral-pre
    // expect(
    //   verifySignature(
    //     encryptedMessage.signature!,
    //     Buffer.from(message),
    //     Buffer.from(aliceSk.toBytes())
    //   )
    // ).toBeTruthy();

    const alicePower = (alice as any).delegatingPower;
    const aliceSk = await alicePower.getSecretKeyFromLabel(label);
    const alicePlaintext = umbral.decryptOriginal(aliceSk, capsule, ciphertext);
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

    // Alice should be able to decrypt capsule she created
    const aliceSk = await (alice as any).delegatingPower.getSecretKeyFromLabel(
      label
    );
    const plaintextAlice = umbral.decryptOriginal(aliceSk, capsule, ciphertext);
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

    const capsuleWithFrags = reencryptKFrags(kFrags, capsule);

    // Bob should be able to decrypt reencrypted ciphertext
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
      enrico.verifyingKey,
      {
        ciphertext,
        capsule: capsuleWithFrags,
        senderVerifyingKey: policyEncryptingKey,
        signature,
      },
      true,
      signature
    );
    expect(isValid).toBeTruthy();
  });
});
