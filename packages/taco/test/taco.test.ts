import { FerveoVariant, SessionStaticSecret } from '@nucypher/nucypher-core';
import {
  aliceSecretKeyBytes,
  fakeDkgFlow,
  fakePorterUri,
  fakeProvider,
  fakeSigner,
  fakeTDecFlow,
  mockCbdDecrypt,
  mockGetRitualIdFromPublicKey,
} from '@nucypher/test-utils';
import { expect, test } from 'vitest';

import * as taco from '../src';
import { conditions, toBytes } from '../src';

import {
  fakeDkgRitual,
  mockDkgParticipants,
  mockGetFinalizedRitualSpy,
  mockGetParticipants,
  mockMakeSessionKey,
} from './test-utils';

// Shared test variables
const message = 'this is a secret';
const ownsNFT = new conditions.ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: 5,
});

test('taco', () => {
  test('encrypts and decrypts', async () => {
    const mockedDkg = fakeDkgFlow(FerveoVariant.precomputed, 0, 4, 4);
    const mockedDkgRitual = fakeDkgRitual(mockedDkg);
    const provider = fakeProvider(aliceSecretKeyBytes);
    const signer = fakeSigner(aliceSecretKeyBytes);
    const getFinalizedRitualSpy = mockGetFinalizedRitualSpy(mockedDkgRitual);

    const messageKit = await taco.encrypt(
      provider,
      message,
      ownsNFT,
      mockedDkg.ritualId,
      signer,
    );
    expect(getFinalizedRitualSpy).toHaveBeenCalled();

    const { decryptionShares } = fakeTDecFlow({
      ...mockedDkg,
      message: toBytes(message),
      dkgPublicKey: mockedDkg.dkg.publicKey(),
      thresholdMessageKit: messageKit,
    });
    const { participantSecrets, participants } = await mockDkgParticipants(
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
    const sessionKeySpy = mockMakeSessionKey(requesterSessionKey);
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
