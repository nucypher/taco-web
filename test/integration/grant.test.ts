import * as umbral from 'umbral-pre';
import { Alice } from '../../src/characters/alice';
import { Bob } from '../../src/characters/bob';
import { Porter } from '../../src/characters/porter';
import { NucypherKeyring } from '../../src/crypto/keyring';
import { BlockchainPolicy, EnactedPolicy } from '../../src/policies/policy';
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

describe('use story', () => {
  let bobKeys: BobKeys;
  let label: string;
  let policy: EnactedPolicy;

  beforeAll(() => {
    bobKeys = makeBobKeys();
  });

  it('alcie grants a new policy to bob', async () => {
    const getUrsulasSpy = jest
      .spyOn(Porter, 'getUrsulas')
      .mockImplementationOnce(async () => {
        return Promise.resolve([]);
      });
    const publishTreasureMapSpy = jest
      .spyOn(Porter, 'publishTreasureMap')
      .mockImplementationOnce(async () => {
        return Promise.resolve([]);
      });
    const publishToBlockchainSpy = jest
      .spyOn(BlockchainPolicy.prototype, 'publishToBlockchain')
      .mockImplementationOnce(() => {
        return '0xdeadbeef';
      });

    const aliceKeyringSeed = Buffer.from('fake-keyring-seed-32-bytes-xxxxx');
    const aliceKeyring = new NucypherKeyring(aliceKeyringSeed);
    const alice = Alice.fromKeyring(aliceKeyring);

    label = 'fake-data-label';
    // TODO: Use it after expanding test suite
    // const policyPublicKey = alice.getPolicyEncryptingKeyFromLabel(label);

    const { signingPublicKey, encryptingPublicKey } = bobKeys;
    const bob = Bob.fromPublicKeys(signingPublicKey, encryptingPublicKey);

    const expiration = new Date();
    const m = 2;
    const n = 3;
    policy = await alice.grant(bob, label, m, n, expiration);

    expect(policy).toBeTruthy();
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(publishTreasureMapSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
  });

  it('bob joins the policy', async () => {
    const { signingPublicKey, encryptingPublicKey } = bobKeys;
    const { aliceSignerPublicKey } = policy;

    const bob = Bob.fromPublicKeys(signingPublicKey, encryptingPublicKey);
    bob.joinPolicy(label, aliceSignerPublicKey);
  });
});
