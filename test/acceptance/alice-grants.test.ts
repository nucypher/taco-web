import { KeyFrag, PublicKey } from 'umbral-pre';

import { Enrico } from '../../src';
import { PolicyMessageKit } from '../../src/crypto/kits';
import { PrePublishedTreasureMap } from '../../src/policies/collections';
import {
  mockAlice,
  mockBob,
  mockEnactArrangement,
  mockEncryptAndSign,
  mockExecuteWorkOrder,
  mockGenerateKFrags,
  mockGetTreasureMapOnce,
  mockGetUrsulasOnce,
  mockProposeArrangement,
  mockPublishToBlockchain,
  mockPublishTreasureMapOnce,
  mockRemoteBob,
  mockUrsulas,
  mockWorkOrderResults,
} from '../utils';

describe('story: alice shares message with bob through policy', () => {
  const message = 'secret-message-from-alice';
  const m = 2;
  const n = 3;
  const expired = new Date();
  const ursulas = mockUrsulas().slice(0, n);

  // Intermediate variables used for mocking
  let treasureMap: PrePublishedTreasureMap;
  let kFrags: KeyFrag[];
  let messageKit: PolicyMessageKit;

  // Application side-channel
  const label = 'fake-data-label';
  let encryptedMessage: PolicyMessageKit;
  let aliceVerifyingKey: PublicKey;
  let policyEncryptingKey: PublicKey;
  let enricoVerifyingKey: PublicKey;

  it('alice grants a new policy to bob', async () => {
    const getUrsulasSpy = mockGetUrsulasOnce(ursulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishTreasureMapSpy = mockPublishTreasureMapOnce();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const proposeArrangementSpy = mockProposeArrangement();
    const enactArrangementSpy = mockEnactArrangement();
    const encryptAndSignSpy = mockEncryptAndSign();

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
    expect(proposeArrangementSpy).toHaveBeenCalledTimes(n);
    expect(enactArrangementSpy).toHaveBeenCalledTimes(n);

    // Persist side-channel
    aliceVerifyingKey = alice.verifyingKey;
    policyEncryptingKey = await alice.getPolicyEncryptingKeyFromLabel(label);

    // Persist variables for mocking
    const mockResults = await generateKFragsSpy.mock.results[0].value;
    kFrags = mockResults.kFrags;
    treasureMap = publishTreasureMapSpy.mock.calls[0][0];
    messageKit = encryptAndSignSpy.mock.results[0].value;

    const results = await alice.generateKFrags(remoteBob, label, m, n);
    kFrags = results.kFrags;
    expect(results.delegatingPublicKey.toBytes()).toEqual(
      policyEncryptingKey.toBytes()
    );
  });

  it('enrico encrypts the message', () => {
    const enrico = new Enrico(policyEncryptingKey);
    encryptedMessage = enrico.encrypt(Buffer.from(message));
    enricoVerifyingKey = enrico.verifyingKey;
  });

  describe('bob', () => {
    const bob = mockBob();

    it('joins the policy', async () => {
      const getTreasureMapSpy = mockGetTreasureMapOnce(
        m,
        messageKit,
        treasureMap
      );

      // TODO: Joining the policy is an equivalent of getting a treasure map
      //       Remove this API in favor of Bob::retrieve?
      await bob.joinPolicy(aliceVerifyingKey, label);

      expect(getTreasureMapSpy).toHaveBeenCalled();
      const destinations = Object.values(bob.treasureMaps)[0].destinations;
      expect(destinations).toEqual(treasureMap.destinations);
    });

    it('retrieves the message', async () => {
      const getUrsulasSpy = mockGetUrsulasOnce(ursulas);
      const mockResults = mockWorkOrderResults(
        ursulas,
        kFrags,
        encryptedMessage.capsule
      );
      const executeWorkOrderSpy = mockExecuteWorkOrder(mockResults);

      const enrico = new Enrico(policyEncryptingKey, enricoVerifyingKey);
      const retrievedMessage = await bob.retrieve(
        [encryptedMessage],
        aliceVerifyingKey,
        label,
        enrico
      );
      const bobPlaintext = retrievedMessage[0].toString();

      expect(getUrsulasSpy).toHaveBeenCalled();
      expect(executeWorkOrderSpy).toHaveBeenCalledTimes(ursulas.length);
      expect(bobPlaintext).toEqual(message);
    });
  });
});
