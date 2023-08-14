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
  fakeTDecFlow,
  fakeWeb3Provider,
  mockCbdDecrypt,
  mockGetExistingRitual,
  mockGetParticipants,
  mockRandomSessionStaticSecret,
} from '../utils';

import { aliceSecretKeyBytes } from './testVariables';

const {
  predefined: { ERC721Ownership },
  ConditionExpression,
} = conditions;

// Shared test variables
const aliceSecretKey = SecretKey.fromBEBytes(aliceSecretKeyBytes);
const ownsNFT = new ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: 5,
});
const conditionExpr = new ConditionExpression(ownsNFT);
const variant = FerveoVariant.precomputed;
// const ritualId = 0;
const message = 'this is a secret';

describe('taco', () => {
  it('encrypts and decrypts', async () => {
    const mockedDkg = fakeDkgFlow(variant, 0, 4, 4);
    const mockedDkgRitual = fakeDkgRitual(mockedDkg);
    const web3Provider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
    const getExistingRitualSpy = mockGetExistingRitual(mockedDkgRitual);

    const tacoMk = await taco.encrypt(
      web3Provider,
      message,
      conditionExpr,
      mockedDkg.ritualId
    );

    expect(getExistingRitualSpy).toHaveBeenCalled();

    const { decryptionShares } = fakeTDecFlow({
      ...mockedDkg,
      message: toBytes(message),
      aad: tacoMk.aad,
      ciphertext: tacoMk.ciphertext,
    });
    const { participantSecrets, participants } = fakeDkgParticipants(
      mockedDkg.ritualId,
      variant
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
      web3Provider,
      tacoMk,
      fakePorterUri
    );
    expect(getParticipantsSpy).toHaveBeenCalled();
    expect(sessionKeySpy).toHaveBeenCalled();
    expect(decryptSpy).toHaveBeenCalled();
    expect(decryptedMessage).toEqual(toBytes(message));
  });
});
