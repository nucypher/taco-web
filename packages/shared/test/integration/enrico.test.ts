// Disabling because we want to access Alice.keyring which is a private property
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConditionExpression, Enrico, PolicyMessageKit } from '../../src';
import { RetrievalResult } from '../../src';
import { toBytes } from '../../src';
import { ERC721Ownership } from '../../src/conditions/predefined';
import {
  bytesEqual,
  fakeAlice,
  fakeBob,
  fromBytes,
  reencryptKFrags,
} from '../utils';

describe('enrico', () => {
  it('alice decrypts message encrypted by enrico', async () => {
    const label = 'fake-label';
    const message = 'fake-message';
    const alice = fakeAlice();

    const policyKey = alice.getPolicyEncryptingKeyFromLabel(label);
    const enrico = new Enrico(policyKey);
    const encrypted = enrico.encryptMessagePre(toBytes(message));

    const aliceKeyring = (alice as any).keyring;
    const aliceSk = await aliceKeyring.getSecretKeyFromLabel(label);
    const alicePlaintext = encrypted.decrypt(aliceSk);
    expect(alicePlaintext).toEqual(alicePlaintext);
  });

  it('bob decrypts reencrypted message', async () => {
    const label = 'fake-label';
    const alice = fakeAlice();
    const bob = fakeBob();

    const policyEncryptingKey = alice.getPolicyEncryptingKeyFromLabel(label);
    const enrico = new Enrico(policyEncryptingKey);

    const plaintext = 'Plaintext message';
    const plaintextBytes = toBytes(plaintext);
    const encrypted = enrico.encryptMessagePre(plaintextBytes);

    // Alice can decrypt capsule she created
    const aliceSk = await (alice as any).keyring.getSecretKeyFromLabel(label);
    const plaintextAlice = encrypted.decrypt(aliceSk);
    expect(fromBytes(plaintextAlice).endsWith(plaintext)).toBeTruthy();

    const threshold = 2;
    const shares = 3;
    const { verifiedKFrags, delegatingKey } = alice.generateKFrags(
      bob,
      label,
      threshold,
      shares,
    );
    expect(delegatingKey.toCompressedBytes()).toEqual(
      policyEncryptingKey.toCompressedBytes(),
    );

    // Bob can decrypt re-encrypted ciphertext
    const { verifiedCFrags } = reencryptKFrags(
      verifiedKFrags,
      encrypted.capsule,
    );
    const bobSk = (bob as any).keyring.secretKey;

    const plaintextBob = encrypted.decryptReencrypted(
      bobSk,
      policyEncryptingKey,
      verifiedCFrags,
    );
    expect(fromBytes(plaintextBob).endsWith(plaintext)).toBeTruthy();

    // Bob can decrypt ciphertext and verify origin of the message
    const cFragsWithUrsulas = verifiedCFrags.map((cFrag, index) => [
      `0x${index}`,
      cFrag,
    ]);
    const result = new RetrievalResult(Object.fromEntries(cFragsWithUrsulas));
    const pk = PolicyMessageKit.fromMessageKit(
      encrypted,
      policyEncryptingKey,
      threshold,
    ).withResult(result);
    expect(pk.isDecryptableByReceiver()).toBeTruthy();

    const decrypted = bob.decrypt(pk);
    expect(bytesEqual(decrypted, plaintextBytes)).toBeTruthy();
  });

  it('enrico generates a message kit with conditions', async () => {
    const label = 'fake-label';
    const message = 'fake-message';
    const alice = fakeAlice();

    const policyKey = alice.getPolicyEncryptingKeyFromLabel(label);

    const ownsBufficornNFT = new ERC721Ownership({
      contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      parameters: [3591],
      chain: 5,
    });

    const conditions = new ConditionExpression(ownsBufficornNFT);

    const enrico = new Enrico(policyKey, undefined, conditions);
    const encrypted = enrico.encryptMessagePre(toBytes(message));

    const aliceKeyring = (alice as any).keyring;
    const aliceSk = await aliceKeyring.getSecretKeyFromLabel(label);
    const alicePlaintext = encrypted.decrypt(aliceSk);
    expect(alicePlaintext).toEqual(alicePlaintext);
  });

  it('can overwrite conditions at encryption time', async () => {
    const label = 'fake-label';
    const message = 'fake-message';
    const alice = fakeAlice();

    const policyKey = alice.getPolicyEncryptingKeyFromLabel(label);

    const ownsBufficornNFT = new ERC721Ownership({
      contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      chain: 5,
      parameters: [3591],
    });

    const ownsNonsenseNFT = new ERC721Ownership({
      contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      chain: 5,
      parameters: [6969],
    });

    const conditions = new ConditionExpression(ownsBufficornNFT);
    const updatedConditions = new ConditionExpression(ownsNonsenseNFT);

    const enrico = new Enrico(policyKey, undefined, conditions);
    const encrypted = enrico.encryptMessagePre(
      toBytes(message),
      updatedConditions,
    );

    const aliceKeyring = (alice as any).keyring;
    const aliceSk = await aliceKeyring.getSecretKeyFromLabel(label);
    const alicePlaintext = encrypted.decrypt(aliceSk);
    expect(alicePlaintext).toEqual(alicePlaintext);
  });
});
