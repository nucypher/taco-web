import { CapsuleFrag, reencrypt } from '@nucypher/nucypher-core';

import {
  Conditions,
  ConditionSet,
  Enrico,
  MessageKit,
  Operator,
  PolicyMessageKit,
} from '../../src';
import { RetrievalResult } from '../../src/kits/retrieval';
import { toBytes, zip } from '../../src/utils';
import { makeTestUrsulas, mockAlice, mockBob, reencryptKFrags } from '../utils';

describe('proxy reencryption', () => {
  const plaintext = toBytes('plaintext-message');
  const threshold = 2;
  const shares = 3;
  const ursulas = makeTestUrsulas().slice(0, shares);
  const label = 'fake-data-label';
  const alice = mockAlice();
  const bob = mockBob();

  it('verifies capsule frags', async () => {
    const { capsule } = new MessageKit(bob.decryptingKey, plaintext, null);
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

    const policyEncryptingKey = alice.getPolicyEncryptingKeyFromLabel(label);
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

  it('encrypts and decrypts reencrypted message with conditions', async () => {
    const { verifiedKFrags } = alice.generateKFrags(
      bob,
      label,
      threshold,
      shares
    );

    const policyEncryptingKey = alice.getPolicyEncryptingKeyFromLabel(label);

    const genuineUndead = new Conditions.ERC721Ownership({
      contractAddress: '0x209e639a0EC166Ac7a1A4bA41968fa967dB30221',
      chain: 1,
    });
    const gnomePals = new Conditions.ERC721Ownership({
      contractAddress: '0x5dB11d7356aa4C0E85Aa5b255eC2B5F81De6d4dA',
      chain: 1,
    });
    const conditions = new ConditionSet([
      genuineUndead,
      Operator.OR(),
      gnomePals,
    ]);

    const enrico = new Enrico(policyEncryptingKey, undefined, conditions);
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
