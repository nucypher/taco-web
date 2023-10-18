import { CapsuleFrag, reencrypt } from '@nucypher/nucypher-core';

import { conditions, Enrico, MessageKit, PolicyMessageKit } from '../../src';
import { CompoundCondition } from '../../src/conditions';
import { RetrievalResult } from '../../src/kits/retrieval';
import { toBytes, zip } from '../../src/utils';
import { fakeAlice, fakeBob, fakeUrsulas, reencryptKFrags } from '../utils';

const {
  predefined: { ERC721Ownership },
  ConditionExpression,
} = conditions;

describe('proxy reencryption', () => {
  const plaintext = toBytes('plaintext-message');
  const threshold = 2;
  const shares = 3;
  const ursulas = fakeUrsulas().slice(0, shares);
  const label = 'fake-data-label';
  const alice = fakeAlice();
  const bob = fakeBob();

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
    const encryptedMessage = enrico.encryptMessagePre(plaintext);

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

    const genuineUndead = new ERC721Ownership({
      contractAddress: '0x209e639a0EC166Ac7a1A4bA41968fa967dB30221',
      chain: 1,
      parameters: [1],
    });
    const gnomePals = new ERC721Ownership({
      contractAddress: '0x5dB11d7356aa4C0E85Aa5b255eC2B5F81De6d4dA',
      chain: 1,
      parameters: [1],
    });
    const conditionsSet = new ConditionExpression(
      new CompoundCondition({
        operator: 'or',
        operands: [genuineUndead.toObj(), gnomePals.toObj()],
      })
    );

    const enrico = new Enrico(policyEncryptingKey, undefined, conditionsSet);
    const encryptedMessage = enrico.encryptMessagePre(plaintext);

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
