import {
  CapsuleFrag,
  EncryptedTreasureMap,
  PublicKey,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';

import { EnactedPolicy, Enrico, MessageKit } from '../../src';
import { Ursula } from '../../src/characters/porter';
import { ChecksumAddress } from '../../src/types';
import { bytesEqual, fromBytes, toBytes } from '../../src/utils';
import {
  mockAlice,
  mockBob,
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockGetUrsulas,
  mockMakeTresureMap,
  mockPolicyManagerPolicyExists,
  mockPolicyManagerRevokePolicy,
  mockPublishToBlockchain,
  mockRemoteBob,
  mockRetrieveCFragsRequest,
  mockRetrieveCFragsRequestThrows,
  mockStakingEscrow,
  mockUrsulas,
  reencryptKFrags,
} from '../utils';

describe('story: alice shares message with bob through policy', () => {
  const message = 'secret-message-from-alice';
  const threshold = 2;
  const shares = 3;
  const paymentPeriods = 3;
  const expiration = new Date(Date.now() + 60 * 1000);
  const rate = 1;
  const ursulas = mockUrsulas().slice(0, shares);

  // Intermediate variables used for mocking
  let encryptedTreasureMap: EncryptedTreasureMap;
  let verifiedKFrags: VerifiedKeyFrag[];
  let ursulaAddresses: ChecksumAddress[];

  // Application side-channel
  const label = 'fake-data-label';
  let policy: EnactedPolicy;
  let encryptedMessage: MessageKit;
  let aliceVerifyingKey: PublicKey;
  let policyEncryptingKey: PublicKey;
  let enricoVerifyingKey: PublicKey;

  it('alice grants a new policy to bob', async () => {
    mockStakingEscrow();
    const getUrsulasSpy = mockGetUrsulas(ursulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTresureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const alice = mockAlice();
    const bob = mockRemoteBob();
    const policyParams = {
      bob,
      label,
      threshold,
      shares,
      expiration,
      paymentPeriods,
      rate,
    };
    policy = await alice.grant(policyParams);

    expect(policy.aliceVerifyingKey).toEqual(alice.verifyingKey.toBytes());
    expect(policy.label).toBe(label);
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
    expect(makeTreasureMapSpy).toHaveBeenCalled();

    // Persist side-channel
    aliceVerifyingKey = alice.verifyingKey;
    policyEncryptingKey = policy.policyKey;
    encryptedTreasureMap = await encryptTreasureMapSpy.mock.results[0].value;

    // Persist variables for mocking and testing
    ursulaAddresses = (makeTreasureMapSpy.mock.calls[0][0] as Ursula[]).map(
      (u) => u.checksumAddress
    );
    verifiedKFrags = makeTreasureMapSpy.mock.calls[0][1] as VerifiedKeyFrag[];
  });

  it('enrico encrypts the message', () => {
    const enrico = new Enrico(policyEncryptingKey);
    encryptedMessage = enrico.encryptMessage(toBytes(message));
    enricoVerifyingKey = enrico.verifyingKey;
  });

  it('bob retrieves and decrypts the message', async () => {
    const bob = mockBob();
    const getUrsulasSpy = mockGetUrsulas(ursulas);
    const retrieveCFragsSpy = mockRetrieveCFragsRequest(
      ursulaAddresses,
      verifiedKFrags,
      encryptedMessage.capsule
    );

    const retrievedMessage = await bob.retrieveAndDecrypt(
      policyEncryptingKey,
      aliceVerifyingKey,
      [encryptedMessage],
      encryptedTreasureMap
    );
    const bobPlaintext = fromBytes(retrievedMessage[0]);

    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(retrieveCFragsSpy).toHaveBeenCalled();
    expect(bobPlaintext).toEqual(message);

    // Can data received by Bob be decrypted?
    const [
      _treasureMap,
      _retrievalKits,
      aliceVerifyingKey_,
      bobEncryptingKey_,
      bobVerifyingKey_,
    ] = retrieveCFragsSpy.mock.calls[0];
    expect(
      bytesEqual(aliceVerifyingKey_.toBytes(), aliceVerifyingKey.toBytes())
    );
    expect(
      bytesEqual(bobEncryptingKey_.toBytes(), bob.decryptingKey.toBytes())
    );
    expect(bytesEqual(bobVerifyingKey_.toBytes(), bob.verifyingKey.toBytes()));

    const { verifiedCFrags } = reencryptKFrags(
      verifiedKFrags,
      encryptedMessage.capsule
    );
    const cFrags = verifiedCFrags.map((verifiedCFrag) =>
      CapsuleFrag.fromBytes(verifiedCFrag.toBytes())
    );
    const areVerified = cFrags.every((cFrag) =>
      cFrag.verify(
        encryptedMessage.capsule,
        aliceVerifyingKey_,
        policyEncryptingKey,
        bob.decryptingKey
      )
    );
    expect(areVerified).toBeTruthy();
  });

  it('alice revokes policy access', async () => {
    const alice = mockAlice();
    const policyManagerPolicyExistsSpy = mockPolicyManagerPolicyExists(false);
    const policyManagerRevokePolicySpy = mockPolicyManagerRevokePolicy();

    await alice.revoke(policy.id.toBytes());
    expect(policyManagerPolicyExistsSpy).toHaveBeenCalled();
    expect(policyManagerRevokePolicySpy).toHaveBeenCalled();
  });

  it('bob fails to retrieve kFrags again and decrypt the message', async () => {
    const bob = mockBob();
    const getUrsulasSpy = mockGetUrsulas(ursulas);
    const retrieveCFragsSpy = mockRetrieveCFragsRequestThrows();

    const retrieveAndDecryptCall = async () =>
      bob.retrieveAndDecrypt(
        policyEncryptingKey,
        aliceVerifyingKey,
        [encryptedMessage],
        encryptedTreasureMap
      );
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(retrieveCFragsSpy).toHaveBeenCalled();
    await expect(retrieveAndDecryptCall).rejects.toThrow();
  });
});
