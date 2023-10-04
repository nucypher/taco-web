import { CapsuleFrag, reencrypt } from '@nucypher/nucypher-core';
import { zip } from '@nucypher/shared';
import { fakeUrsulas } from '@nucypher/test-utils';
import { beforeAll, expect, test } from 'vitest';

import { Alice, Bob, Enrico, MessageKit, toBytes } from '../src';
import { PolicyMessageKit, RetrievalResult } from '../src/kits';

import { fakeAlice, fakeBob, reencryptKFrags } from './utils';

test('proxy reencryption', () => {
  let alice: Alice;
  let bob: Bob;
  const plaintext = toBytes('plaintext-message');
  const threshold = 2;
  const shares = 3;
  const label = 'fake-data-label';

  test('verifies capsule frags', async () => {
    beforeAll(async () => {
      bob = fakeBob();
      alice = fakeAlice();
    });

    const { capsule } = new MessageKit(bob.decryptingKey, plaintext, null);
    const { delegatingKey, verifiedKFrags } = alice.generateKFrags(
      bob,
      label,
      threshold,
      shares,
    );

    const { verifiedCFrags } = reencryptKFrags(verifiedKFrags, capsule);
    const cFrags = verifiedCFrags.map((verifiedCFrag) =>
      CapsuleFrag.fromBytes(verifiedCFrag.toBytes()),
    );
    const areVerified = cFrags.every((cFrag) =>
      cFrag.verify(
        capsule,
        alice.verifyingKey,
        delegatingKey,
        bob.decryptingKey,
      ),
    );
    expect(areVerified).toBeTruthy();
  });

  test('encrypts and decrypts reencrypted message', async () => {
    const { verifiedKFrags } = alice.generateKFrags(
      bob,
      label,
      threshold,
      shares,
    );

    const policyEncryptingKey = alice.getPolicyEncryptingKeyFromLabel(label);
    const enrico = new Enrico(policyEncryptingKey);
    const encryptedMessage = enrico.encryptMessage(plaintext);

    const ursulaAddresses = fakeUrsulas().map(
      (ursula) => ursula.checksumAddress,
    );
    const reencrypted = verifiedKFrags.map((kFrag) =>
      reencrypt(encryptedMessage.capsule, kFrag),
    );
    const results = new RetrievalResult(
      Object.fromEntries(zip(ursulaAddresses, reencrypted)),
    );
    const policyMessageKit = PolicyMessageKit.fromMessageKit(
      encryptedMessage,
      policyEncryptingKey,
      threshold,
    ).withResult(results);
    expect(policyMessageKit.isDecryptableByReceiver()).toBeTruthy();

    const bobPlaintext = bob.decrypt(policyMessageKit);
    expect(bobPlaintext).toEqual(plaintext);
  });

  test('encrypts and decrypts reencrypted message with conditions', async () => {
    const { verifiedKFrags } = alice.generateKFrags(
      bob,
      label,
      threshold,
      shares,
    );

    const policyEncryptingKey = alice.getPolicyEncryptingKeyFromLabel(label);

    const enrico = new Enrico(policyEncryptingKey);
    const encryptedMessage = enrico.encryptMessage(plaintext);

    const ursulaAddresses = fakeUrsulas().map(
      (ursula) => ursula.checksumAddress,
    );
    const reencrypted = verifiedKFrags.map((kFrag) =>
      reencrypt(encryptedMessage.capsule, kFrag),
    );
    const results = new RetrievalResult(
      Object.fromEntries(zip(ursulaAddresses, reencrypted)),
    );
    const policyMessageKit = PolicyMessageKit.fromMessageKit(
      encryptedMessage,
      policyEncryptingKey,
      threshold,
    ).withResult(results);
    expect(policyMessageKit.isDecryptableByReceiver()).toBeTruthy();

    const bobPlaintext = bob.decrypt(policyMessageKit);
    expect(bobPlaintext).toEqual(plaintext);
  });
});
