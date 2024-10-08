import {
  CapsuleFrag,
  EncryptedTreasureMap,
  MessageKit,
  PublicKey,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import { ChecksumAddress, domains, initialize, Ursula } from '@nucypher/shared';
import {
  bytesEqual,
  fakePorterUri,
  fakeProvider,
  fakeUrsulas,
  fromBytes,
  mockGetUrsulas,
  mockRetrieveCFragsRequest,
} from '@nucypher/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import { EnactedPolicy, Enrico, toBytes } from '../../src';
import {
  fakeAlice,
  fakeBob,
  fakeRemoteBob,
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockMakeTreasureMap,
  mockPublishToBlockchain,
  reencryptKFrags,
} from '../utils';

describe('story: alice shares message with bob through policy', () => {
  const message = 'secret-message-from-alice';
  const threshold = 2;
  const shares = 3;
  const startDate = new Date();
  const endDate = new Date(Date.now() + 60 * 1000);

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

  beforeEach(async () => {
    await initialize();
  });

  it('alice grants a new policy to bob', async () => {
    const getUrsulasSpy = mockGetUrsulas(fakeUrsulas().slice(0, shares));
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const alice = fakeAlice();
    const bob = fakeRemoteBob();
    const policyParams = {
      bob,
      label,
      threshold,
      shares,
      startDate,
      endDate,
    };
    const provider = fakeProvider();
    policy = await alice.grant(
      provider,
      provider.getSigner(),
      domains.DEVNET,
      fakePorterUri,
      policyParams,
    );

    expect(
      bytesEqual(
        policy.aliceVerifyingKey.toCompressedBytes(),
        alice.verifyingKey.toCompressedBytes(),
      ),
    ).toBeTruthy();
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
      (u) => u.checksumAddress,
    );
    verifiedKFrags = makeTreasureMapSpy.mock.calls[0][1] as VerifiedKeyFrag[];
  });

  it('enrico encrypts the message', () => {
    const enrico = new Enrico(policyEncryptingKey);
    encryptedMessage = enrico.encryptMessage(toBytes(message));
  });

  it('bob retrieves and decrypts the message', async () => {
    const bob = fakeBob();
    const retrieveCFragsSpy = mockRetrieveCFragsRequest(
      ursulaAddresses,
      verifiedKFrags,
      encryptedMessage.capsule,
    );

    const retrievedMessage = await bob.retrieveAndDecrypt(
      fakePorterUri,
      policyEncryptingKey,
      aliceVerifyingKey,
      [encryptedMessage],
      encryptedTreasureMap,
    );
    const bobPlaintext = fromBytes(retrievedMessage[0]);

    expect(retrieveCFragsSpy).toHaveBeenCalled();
    expect(bobPlaintext).toEqual(message);

    // Can data received by Bob be decrypted?
    const [
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _treasureMap,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _retrievalKits,
      aliceVerifyingKey_,
      bobEncryptingKey_,
      bobVerifyingKey_,
    ] = retrieveCFragsSpy.mock.calls[0];
    expect(
      bytesEqual(
        aliceVerifyingKey_.toCompressedBytes(),
        aliceVerifyingKey.toCompressedBytes(),
      ),
    );
    expect(
      bytesEqual(
        bobEncryptingKey_.toCompressedBytes(),
        bob.decryptingKey.toCompressedBytes(),
      ),
    );
    expect(
      bytesEqual(
        bobVerifyingKey_.toCompressedBytes(),
        bob.verifyingKey.toCompressedBytes(),
      ),
    );

    const { verifiedCFrags } = reencryptKFrags(
      verifiedKFrags,
      encryptedMessage.capsule,
    );
    const cFrags = verifiedCFrags.map((verifiedCFrag) =>
      CapsuleFrag.fromBytes(verifiedCFrag.toBytes()),
    );
    const areVerified = cFrags.every((cFrag) =>
      cFrag.verify(
        encryptedMessage.capsule,
        aliceVerifyingKey_,
        policyEncryptingKey,
        bob.decryptingKey,
      ),
    );
    expect(areVerified).toBeTruthy();
  });
});
