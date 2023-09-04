import {
  FerveoVariant,
  SecretKey,
  SessionStaticSecret,
} from '@nucypher/nucypher-core';

import { conditions } from '../../src';
import { taco } from '../../src/taco';
import { toBytes } from '../../src/utils';
import {
  fakeDkgFlow,
  fakeDkgParticipants,
  fakeDkgRitual,
  fakePorterUri,
  fakeProvider,
  fakeSigner,
  fakeTDecFlow,
  mockCbdDecrypt,
  mockGetExistingRitual,
  mockGetParticipants,
  mockRandomSessionStaticSecret,
} from '../utils';

import { aliceSecretKeyBytes } from './testVariables';

const {
  predefined: { ERC721Ownership },
} = conditions;

// Shared test variables
const aliceSecretKey = SecretKey.fromBEBytes(aliceSecretKeyBytes);
const ownsNFT = new ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: 5,
});
const variant = FerveoVariant.precomputed;
const message = 'this is a secret';

describe('taco', () => {
  it('encrypts and decrypts', async () => {
    const mockedDkg = fakeDkgFlow(variant, 0, 4, 4);
    const mockedDkgRitual = fakeDkgRitual(mockedDkg);
    const provider = fakeProvider(aliceSecretKey.toBEBytes());
    const signer = fakeSigner(aliceSecretKey.toBEBytes());
    const getExistingRitualSpy = mockGetExistingRitual(mockedDkgRitual);

    const tacoMk = await taco.encrypt(
      provider,
      message,
      ownsNFT,
      mockedDkg.ritualId
    );

    expect(getExistingRitualSpy).toHaveBeenCalled();

    const { decryptionShares } = fakeTDecFlow({
      ...mockedDkg,
      message: toBytes(message),
      dkgPublicKey: mockedDkg.dkg.publicKey(),
      thresholdMessageKit: tacoMk.thresholdMessageKit,
    });
    const { participantSecrets, participants } = fakeDkgParticipants(
      mockedDkg.ritualId
    );
    const requesterSessionKey = SessionStaticSecret.random();
    const decryptSpy = mockCbdDecrypt(
      mockedDkg.ritualId,
      decryptionShares,
      participantSecrets,
      requesterSessionKey.publicKey()
    );
    const getParticipantsSpy = mockGetParticipants(participants);
    const sessionKeySpy = mockRandomSessionStaticSecret(requesterSessionKey);

    const decryptedMessage = await taco.decrypt(
      provider,
      tacoMk,
      signer,
      fakePorterUri
    );
    expect(getParticipantsSpy).toHaveBeenCalled();
    expect(sessionKeySpy).toHaveBeenCalled();
    expect(decryptSpy).toHaveBeenCalled();
    expect(decryptedMessage).toEqual(toBytes(message));
  });
});
