import {
  FerveoVariant,
  SecretKey,
  SessionStaticSecret,
} from '@nucypher/nucypher-core';
import { predefined, toBytes } from '@nucypher/shared';
import {
  aliceSecretKeyBytes,
  fakeDkgFlow,
  fakeDkgRitual,
  fakePorterUri,
  fakeProvider,
  fakeSigner,
  fakeTDecFlow,
  mockCbdDecrypt,
  mockDkgParticipants,
  mockGetFinalizedRitualSpy,
  mockGetParticipants,
  mockGetRitualIdFromPublicKey,
  mockRandomSessionStaticSecret,
} from '@nucypher/test-utils';
import { expect, test } from 'vitest';

import * as taco from '../src';

// Shared test variables
const aliceSecretKey = SecretKey.fromBEBytes(aliceSecretKeyBytes);
const ownsNFT = new predefined.ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: 5,
});
const variant = FerveoVariant.precomputed;
const message = 'this is a secret';

test('taco', () => {
  test('encrypts and decrypts', async () => {
    const mockedDkg = fakeDkgFlow(variant, 0, 4, 4);
    const mockedDkgRitual = fakeDkgRitual(mockedDkg);
    const provider = fakeProvider(aliceSecretKey.toBEBytes());
    const signer = fakeSigner(aliceSecretKey.toBEBytes());
    const getFinalizedRitualSpy = mockGetFinalizedRitualSpy(mockedDkgRitual);

    const messageKit = await taco.encrypt(
      provider,
      message,
      ownsNFT,
      mockedDkg.ritualId,
    );
    expect(getFinalizedRitualSpy).toHaveBeenCalled();

    const { decryptionShares } = fakeTDecFlow({
      ...mockedDkg,
      message: toBytes(message),
      dkgPublicKey: mockedDkg.dkg.publicKey(),
      thresholdMessageKit: messageKit,
    });
    const { participantSecrets, participants } = mockDkgParticipants(
      mockedDkg.ritualId,
    );
    const requesterSessionKey = SessionStaticSecret.random();
    const decryptSpy = mockCbdDecrypt(
      mockedDkg.ritualId,
      decryptionShares,
      participantSecrets,
      requesterSessionKey.publicKey(),
    );
    const getParticipantsSpy = mockGetParticipants(participants);
    const sessionKeySpy = mockRandomSessionStaticSecret(requesterSessionKey);
    const getRitualIdFromPublicKey = mockGetRitualIdFromPublicKey(
      mockedDkg.ritualId,
    );
    const getRitualSpy = mockGetFinalizedRitualSpy(mockedDkgRitual);

    const decryptedMessage = await taco.decrypt(
      provider,
      messageKit,
      signer,
      fakePorterUri,
    );
    expect(getParticipantsSpy).toHaveBeenCalled();
    expect(sessionKeySpy).toHaveBeenCalled();
    expect(getRitualIdFromPublicKey).toHaveBeenCalled();
    expect(getRitualSpy).toHaveBeenCalled();
    expect(decryptSpy).toHaveBeenCalled();
    expect(decryptedMessage).toEqual(toBytes(message));
  });
});
