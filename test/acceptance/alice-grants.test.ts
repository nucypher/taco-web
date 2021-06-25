import { Enrico } from '../../src';
import { PolicyMessageKit } from '../../src/crypto/kits';
import { PrePublishedTreasureMap } from '../../src/policies/collections';
import { UmbralKFrag, UmbralPublicKey } from '../../src/types';
import {
  mockAlice,
  mockBob,
  mockEnactArrangement,
  mockGenerateKFrags,
  mockGetTreasureMap,
  mockGetUrsulas,
  mockProposeArrangement,
  mockPublishToBlockchain,
  mockPublishTreasureMap,
  mockRemoteBob,
  mockUrsulas,
} from '../utils';

describe('alice and bob', () => {
  const ursulas = mockUrsulas();
  const message = 'secret-message-from-alice';
  const m = 2;
  const n = 3;
  const expired = new Date();

  // Intermediate variables used for mocking
  let treasureMap: PrePublishedTreasureMap;
  let kFrags: UmbralKFrag[];

  // Application side-channel
  const label = 'fake-data-label';
  let ciphertext: PolicyMessageKit;
  let aliceVerifyingKey: UmbralPublicKey;
  let policyPublicKey: UmbralPublicKey;

  it('alice grants a new policy to bob', async () => {
    const getUrsulasSpy = mockGetUrsulas(ursulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishTreasureMapSpy = mockPublishTreasureMap();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const proposeArrangementSpy = mockProposeArrangement();
    const enactArrangementSpy = mockEnactArrangement();

    const alice = mockAlice();
    const remoteBob = mockRemoteBob();

    const policy = await alice.grant(remoteBob, label, m, n, expired);

    const nodeIds = new Set(ursulas.map(u => u.checksumAddress));
    const revocationNodeIds = new Set(
      Object.keys(policy.revocationKit.revocations)
    );
    const treasureMapNodeIds = new Set(
      Object.keys(policy.treasureMap.destinations)
    );
    revocationNodeIds.forEach(nodeId =>
      expect(nodeIds.has(nodeId)).toBeTruthy()
    );
    treasureMapNodeIds.forEach(nodeId =>
      expect(nodeIds.has(nodeId)).toBeTruthy()
    );
    expect(policy.aliceVerifyingKey).toEqual(
      Buffer.from(alice.verifyingKey.toBytes())
    );
    expect(policy.label).toBe(label);
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishTreasureMapSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(proposeArrangementSpy).toHaveBeenCalledTimes(ursulas.length);
    expect(enactArrangementSpy).toHaveBeenCalledTimes(ursulas.length);

    // Persist side-channel
    aliceVerifyingKey = alice.verifyingKey;
    policyPublicKey = await alice.getPolicyEncryptingKeyFromLabel(label);

    // Persist variables for mocking
    const mockResults = await generateKFragsSpy.mock.results[0].value;
    kFrags = mockResults.kFrags;
    treasureMap = publishTreasureMapSpy.mock.calls[0][0];
  });

  it('enrico encrypts the message', () => {
    const enrico = new Enrico(policyPublicKey);
    ciphertext = enrico.encrypt(Buffer.from(message));
    expect(ciphertext).toBeDefined();
  });

  describe('bob', () => {
    const bob = mockBob();

    it('joins the policy', async () => {
      const getTreasureMapSpy = mockGetTreasureMap(
        m,
        ciphertext,
        treasureMap,
        kFrags
      );

      await bob.joinPolicy(label, aliceVerifyingKey);

      expect(getTreasureMapSpy).toHaveBeenCalled();
      expect(Object.values(bob.treasureMaps)[0].destinations).toEqual(
        treasureMap.destinations
      );
    });

    it('retrieves the message', async () => {
      const getUrsulasSpy = mockGetUrsulas(ursulas);

      const retrievedMessage = await bob.retrieve(
        [ciphertext],
        label,
        new Enrico(policyPublicKey),
        aliceVerifyingKey
      );

      expect(getUrsulasSpy).toHaveBeenCalled();
      expect(retrievedMessage).toEqual(message);
    });
  });
});
