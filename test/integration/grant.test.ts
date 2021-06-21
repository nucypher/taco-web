import axios from 'axios';
import { Alice } from '../../src/characters/alice';
import { Bob } from '../../src/characters/bob';
import { EncryptedMessage, Enrico } from '../../src/characters/enrico';
import { IUrsula, Porter } from '../../src/characters/porter';
import { Ursula } from '../../src/characters/ursula';
import { NucypherKeyring } from '../../src/crypto/keyring';
import {
  Arrangement,
  BlockchainPolicy,
  EnactedPolicy,
} from '../../src/policies/policy';
import { UmbralKFrag, UmbralPublicKey } from '../../src/types';
import { BobKeys, mockBobKeys, mockPorterUrsulas } from '../utils';

describe('use story', () => {
  let bobKeys: BobKeys;
  let label: string;
  let policy: EnactedPolicy;
  let policyPublicKey: UmbralPublicKey;
  let encryptedMessage: EncryptedMessage;

  beforeAll(() => {
    bobKeys = mockBobKeys();
  });

  it('alice grants a new policy to bob', async () => {
    const mockUrsulas = mockPorterUrsulas();
    const numUrsulas = mockUrsulas.result.ursulas.length;
    const getUrsulasSpy = jest
      .spyOn(axios, 'get')
      .mockImplementationOnce(async () => {
        return Promise.resolve({ data: mockUrsulas });
      });
    const publishTreasureMapSpy = jest
      .spyOn(Porter, 'publishTreasureMap')
      .mockImplementationOnce(async () => {
        return Promise.resolve([]);
      });
    const publishToBlockchainSpy = jest
      .spyOn(BlockchainPolicy.prototype, 'publishToBlockchain')
      .mockImplementation(() => {
        return '0xdeadbeef';
      });
    const proposeArrangementSpy = jest
      .spyOn(Ursula, 'proposeArrangement')
      .mockImplementation((ursula: IUrsula) => ursula.checksumAddress);
    const enactArrangementSpy = jest
      .spyOn(BlockchainPolicy.prototype, 'enactArrangement')
      .mockImplementation(
        (
          _arrangement: Arrangement,
          _kFrag: UmbralKFrag,
          ursula: IUrsula,
          _publicationTransaction: any
        ) => {
          return ursula.checksumAddress;
        }
      );

    const aliceKeyringSeed = Buffer.from('fake-keyring-seed-32-bytes-xxxxx');
    const aliceKeyring = new NucypherKeyring(aliceKeyringSeed);
    const alice = Alice.fromKeyring(aliceKeyring);

    label = 'fake-data-label';
    policyPublicKey = await alice.getPolicyEncryptingKeyFromLabel(label);

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
    expect(proposeArrangementSpy).toHaveBeenCalledTimes(numUrsulas);
    expect(enactArrangementSpy).toHaveBeenCalledTimes(numUrsulas);
  });

  it('enrico encrypts the message', () => {
    const message = 'secret-message-from-alice';
    const enrico = new Enrico(policyPublicKey);
    encryptedMessage = enrico.encryptMessage(Buffer.from(message));
  });

  it('bob joins the policy', async () => {
    const { signingPublicKey, encryptingPublicKey } = bobKeys;
    const { aliceSignerPublicKey } = policy;

    const bob = Bob.fromPublicKeys(signingPublicKey, encryptingPublicKey);
    bob.joinPolicy(label, aliceSignerPublicKey);
  });
});
