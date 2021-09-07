import { KeyFrag, PublicKey } from 'umbral-pre';

import { Enrico, PolicyMessageKit } from '../../src';
import { EncryptedTreasureMap } from '../../src/policies/collections';
import { fromBytes, toBytes } from '../../src/utils';
import {
  mockAlice,
  mockBob,
  mockEnactArrangement,
  mockEncryptTreasureMap,
  mockExecuteWorkOrder,
  mockGenerateKFrags,
  mockGetUrsulasOnce,
  mockProposeArrangement,
  mockPublishToBlockchain,
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
  let encryptedTreasureMap: EncryptedTreasureMap;
  let verifiedKFrags: KeyFrag[];

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
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const proposeArrangementSpy = mockProposeArrangement();
    const enactArrangementSpy = mockEnactArrangement();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const alice = mockAlice();
    const bob = mockRemoteBob();
    const policyParams = { bob, label, m, n, expiration, rate };
    const policy = await alice.grant(policyParams);

    expect(policy.aliceVerifyingKey).toEqual(alice.verifyingKey.toBytes());
    expect(policy.label).toBe(label);
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
    expect(proposeArrangementSpy).toHaveBeenCalledTimes(n);
    expect(enactArrangementSpy).toHaveBeenCalledTimes(n);

    // Persist side-channel
    aliceVerifyingKey = alice.verifyingKey;
    policyEncryptingKey = await alice.getPolicyEncryptingKeyFromLabel(label);
    encryptedTreasureMap = await encryptTreasureMapSpy.mock.results[0].value;

    // Persist variables for mocking
    const mockResults = await generateKFragsSpy.mock.results[0].value;
    expect(mockResults.delegatingPublicKey.toBytes()).toEqual(policyEncryptingKey.toBytes());
    verifiedKFrags = mockResults.verifiedKFrags;
  });

  it('enrico encrypts the message', () => {
    const enrico = new Enrico(policyEncryptingKey);
    encryptedMessage = enrico.encrypt(toBytes(message));
    enricoVerifyingKey = enrico.verifyingKey;
  });

  describe('bob', () => {
    const bob = mockBob();

    it('retrieves the message', async () => {
      const getUrsulasSpy = mockGetUrsulasOnce(ursulas);
      const mockResults = mockWorkOrderResults(ursulas, verifiedKFrags, encryptedMessage.capsule);
      const executeWorkOrderSpy = mockExecuteWorkOrder(mockResults);

      const retrievedMessage = await bob.retrieve(
        label,
        policyEncryptingKey,
        aliceVerifyingKey,
        encryptedMessage,
        encryptedTreasureMap,
      );
      const bobPlaintext = fromBytes(retrievedMessage[0]);

      expect(getUrsulasSpy).toHaveBeenCalled();
      expect(executeWorkOrderSpy).toHaveBeenCalledTimes(ursulas.length);
      expect(bobPlaintext).toEqual(message);
    });
  });
});
