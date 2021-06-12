import * as umbral from 'umbral-pre';
import { Alice } from '../../src/characters/alice';
import { Bob } from '../../src/characters/bob';
import { Porter } from '../../src/characters/porter';
import { NucypherKeyring } from '../../src/crypto/keyring';
import { DecryptingPower, SigningPower } from '../../src/crypto/powers';

const makeBobKeys = () => {
  const encryptingPrivateKey = umbral.SecretKey.random();
  const signingPrivateKey = umbral.SecretKey.random();
  return {
    encryptingPrivateKey,
    signingPrivateKey,
    encryptingPublicKey: umbral.PublicKey.from_secret_key(encryptingPrivateKey),
    signingPublicKey: umbral.PublicKey.from_secret_key(signingPrivateKey),
  };
};

describe('alice', () => {
  it('grants new policy to bob', async () => {
    jest.spyOn(Porter, 'getUrsulas').mockImplementationOnce(() => {
      return []
    });

    // TODO: Remove after fixing factory method
    jest.spyOn(Bob, 'fromPublicKeys').mockImplementationOnce(() => {
      const signingPower = new SigningPower(
        Buffer.from('fake-keying-material-32-bytes-01')
      );
      const decryptingPower = new DecryptingPower(
        Buffer.from('fake-keying-material-32-bytes-02')
      );
      return new Bob(signingPower, decryptingPower);
    });

    const aliceKeyringSeed = Buffer.from(
      'fake-keyring-seed-32-bytes-xxxxx'
    );
    const aliceKeyring = new NucypherKeyring(aliceKeyringSeed);
    const alice = new Alice(aliceKeyring);

    const label = 'fake-data-label';
    // TODO: Use it when expanding test suite
    // const policyPublicKey = alice.getPolicyEncryptingKeyFromLabel(label);

    const { signingPublicKey, encryptingPublicKey } = makeBobKeys();
    const bob = Bob.fromPublicKeys(signingPublicKey, encryptingPublicKey);

    const expiration = new Date();
    const m = 2;
    const n = 3;
    const policy = alice.grant(bob, label, m, n, expiration);

    expect(policy).toBeTruthy();
  });
});
