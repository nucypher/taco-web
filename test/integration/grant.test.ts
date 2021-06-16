import * as umbral from 'umbral-pre';
import { Alice } from '../../src/characters/alice';
import { Bob } from '../../src/characters/bob';
import { Porter } from '../../src/characters/porter';
import { NucypherKeyring } from '../../src/crypto/keyring';
import { BlockchainPolicy } from '../../src/policies/policy';
import { UmbralPublicKey, UmbralSecretKey } from '../../src/types';

interface BobKeys {
  encryptingPrivateKey: UmbralSecretKey;
  signingPrivateKey: UmbralSecretKey;
  encryptingPublicKey: UmbralPublicKey;
  signingPublicKey: UmbralPublicKey;
}

const makeBobKeys = (): BobKeys => {
  const encryptingPrivateKey = umbral.SecretKey.random();
  const signingPrivateKey = umbral.SecretKey.random();
  return {
    encryptingPrivateKey,
    signingPrivateKey,
    encryptingPublicKey: umbral.PublicKey.fromSecretKey(encryptingPrivateKey),
    signingPublicKey: umbral.PublicKey.fromSecretKey(signingPrivateKey),
  };
};

describe('alice', () => {
  let bobKeys: BobKeys;

  beforeAll(() => {
    bobKeys = makeBobKeys();
  });

  it('grants a new policy to bob', async () => {
    jest.spyOn(Porter, 'getUrsulas').mockImplementationOnce(() => {
      return [];
    });
    jest.spyOn(Porter, 'publishTreasureMap').mockImplementationOnce(() => {
      return [];
    });
    jest
      .spyOn(BlockchainPolicy.prototype, 'publishToBlockchain')
      .mockImplementationOnce(() => {
        return '0xdeadbeef';
      });

    const aliceKeyringSeed = Buffer.from('fake-keyring-seed-32-bytes-xxxxx');
    const aliceKeyring = new NucypherKeyring(aliceKeyringSeed);
    const alice = new Alice(aliceKeyring);

    const label = 'fake-data-label';
    // TODO: Use it after expanding test suite
    // const policyPublicKey = alice.getPolicyEncryptingKeyFromLabel(label);

    const { signingPublicKey, encryptingPublicKey } = bobKeys;
    const bob = Bob.fromPublicKeys(signingPublicKey, encryptingPublicKey);

    const expiration = new Date();
    const m = 2;
    const n = 3;
    const policy = await alice.grant(bob, label, m, n, expiration);

    expect(policy).toBeTruthy();

    // const { aliceSignerPublicKey } = policy;
    // bob.joinPolicy(label, aliceSignerPublicKey);
  });
});
