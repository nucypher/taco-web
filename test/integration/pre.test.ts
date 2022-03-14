import { CapsuleFrag, reencrypt } from '@nucypher/nucypher-core';

import { Enrico, MessageKit } from '../../src';
import { PolicyMessageKit } from '../../src/kits/message';
import { RetrievalResult } from '../../src/kits/retrieval';
import { toBytes, zip } from '../../src/utils';
import { mockAlice, mockBob, mockUrsulas, reencryptKFrags } from '../utils';

describe('proxy reencryption', () => {
  const plaintext = toBytes('plaintext-message');
  const threshold = 2;
  const shares = 3;
  const ursulas = mockUrsulas().slice(0, shares);
  const label = 'fake-data-label';
  const alice = mockAlice();
  const bob = mockBob();

  it('verifies capsule frags', async () => {
    const { capsule } = new MessageKit(bob.decryptingKey, plaintext);
    const { delegatingKey, verifiedKFrags } = alice.generateKFrags(
      bob,
      label,
      threshold,
      shares
    );

    const { verifiedCFrags } = reencryptKFrags(verifiedKFrags, capsule);
    const cFrags = verifiedCFrags.map((verifiedCFrag) =>
      CapsuleFrag.fromBytes(verifiedCFrag.toBytes())
    );
    const areVerified = cFrags.every((cFrag) =>
      cFrag.verify(
        capsule,
        alice.verifyingKey,
        delegatingKey,
        bob.decryptingKey
      )
    );
    expect(areVerified).toBeTruthy();
  });

  it('encrypts and decrypts reencrypted message', async () => {
    const { verifiedKFrags } = alice.generateKFrags(
      bob,
      label,
      threshold,
      shares
    );

    const policyEncryptingKey = await alice.getPolicyEncryptingKeyFromLabel(
      label
    );
    const enrico = new Enrico(policyEncryptingKey);
    const encryptedMessage = enrico.encryptMessage(plaintext);

    const ursulaAddresses = ursulas.map((ursula) => ursula.checksumAddress);
    const reencrypted = verifiedKFrags.map((kFrag) =>
      reencrypt(encryptedMessage.capsule, kFrag)
    );
    const results = new RetrievalResult(
      Object.fromEntries(zip(ursulaAddresses, reencrypted))
    );
    const policyMessageKit = PolicyMessageKit.fromMessageKit(
      encryptedMessage,
      policyEncryptingKey,
      threshold
    ).withResult(results);
    expect(policyMessageKit.isDecryptableByReceiver()).toBeTruthy();

    const bobPlaintext = bob.decrypt(policyMessageKit);
    expect(bobPlaintext).toEqual(plaintext);
  });
});
