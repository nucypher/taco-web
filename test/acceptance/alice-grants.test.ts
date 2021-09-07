import fs from 'fs';

import { KeyFrag, PublicKey } from 'umbral-pre';

import { Enrico, PolicyMessageKit } from '../../src';
import { EncryptedTreasureMap, KFragDestinations } from '../../src/policies/collections';
import { fromBytes, toBytes } from '../../src/utils';
import {
  mockAlice,
  mockBob,
  mockEnactArrangement,
  mockExecuteWorkOrder,
  mockGenerateKFrags,
  mockGetTreasureMapOnce,
  mockGetUrsulasOnce,
  mockMakeDestinations,
  mockProposeArrangement,
  mockPublishToBlockchain,
  mockPublishTreasureMapOnce,
  mockRemoteBob,
  mockStakingEscrow,
  mockUrsulas,
  mockWorkOrderResults,
} from '../utils';

describe('story: alice shares message with bob through policy', () => {
  const message = 'secret-message-from-alice';
  const m = 2;
  const n = 3;
  const expiration = new Date(Date.now() + 60 * 1000);
  const rate = 1;
  const ursulas = mockUrsulas().slice(0, n);

  // Intermediate variables used for mocking
  let treasureMap: EncryptedTreasureMap;
  let verifiedKFrags: KeyFrag[];
  let kFragDestinations: KFragDestinations;

  // Application side-channel
  const label = 'fake-data-label';
  let encryptedMessage: PolicyMessageKit;
  let aliceVerifyingKey: PublicKey;
  let policyEncryptingKey: PublicKey;
  let enricoVerifyingKey: PublicKey;

  it('alice grants a new policy to bob', async () => {
    mockStakingEscrow();
    const getUrsulasSpy = mockGetUrsulasOnce(ursulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishTreasureMapSpy = mockPublishTreasureMapOnce();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const proposeArrangementSpy = mockProposeArrangement();
    const enactArrangementSpy = mockEnactArrangement();
    const makeDestinationsSpy = mockMakeDestinations();

    const alice = mockAlice();
    const bob = mockRemoteBob();
    const policyParams = { bob, label, m, n, expiration, rate };
    const policy = await alice.grant(policyParams);

    expect(policy.aliceVerifyingKey).toEqual(alice.verifyingKey.toBytes());
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
    expect(mockResults.delegatingPublicKey.toBytes()).toEqual(policyEncryptingKey.toBytes());
    verifiedKFrags = mockResults.verifiedKFrags;
    treasureMap = publishTreasureMapSpy.mock.calls[0][0];
    kFragDestinations = makeDestinationsSpy.mock.results[0].value;
  });

  it('enrico encrypts the message', () => {
    const enrico = new Enrico(policyEncryptingKey);
    encryptedMessage = enrico.encrypt(toBytes(message));
    enricoVerifyingKey = enrico.verifyingKey;
  });

  describe('bob', () => {
    const bob = mockBob();

    it('joins the policy', async () => {
      const getTreasureMapSpy = mockGetTreasureMapOnce(m, treasureMap.encryptedTreasureMap, kFragDestinations);

      // TODO: Joining the policy is an equivalent of getting a treasure map
      //       Remove this API in favor of Bob::retrieve?
      await bob.joinPolicy(aliceVerifyingKey, label);

      expect(getTreasureMapSpy).toHaveBeenCalled();
      const destinations = Object.values(bob.treasureMaps)[0].destinations;
      expect(Object.keys(destinations).length).toEqual(n);
    });

    it('retrieves the message', async () => {
      const getUrsulasSpy = mockGetUrsulasOnce(ursulas);
      const mockResults = mockWorkOrderResults(ursulas, verifiedKFrags, encryptedMessage.capsule);
      const executeWorkOrderSpy = mockExecuteWorkOrder(mockResults);

      const enrico = new Enrico(policyEncryptingKey, enricoVerifyingKey);
      const retrievedMessage = await bob.retrieve(
        [ encryptedMessage ],
        aliceVerifyingKey,
        label,
        enrico,
      );
      const bobPlaintext = fromBytes(retrievedMessage[0]);

      expect(getUrsulasSpy).toHaveBeenCalled();
      expect(executeWorkOrderSpy).toHaveBeenCalledTimes(ursulas.length);
      expect(bobPlaintext).toEqual(message);
    });
  });
});
