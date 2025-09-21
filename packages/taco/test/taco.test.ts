import {
  FerveoVariant,
  initialize,
  SessionStaticSecret,
} from '@nucypher/nucypher-core';
import * as tacoAuth from '@nucypher/taco-auth';
import { USER_ADDRESS_PARAM_DEFAULT } from '@nucypher/taco-auth';
import {
  aliceSecretKeyBytes,
  fakeDkgFlow,
  fakePorterUri,
  fakeProvider,
  fakeTDecFlow,
  mockGetRitualIdFromPublicKey,
  mockTacoDecrypt,
  TEST_CHAIN_ID,
  TEST_SIWE_PARAMS,
} from '@nucypher/test-utils';
import { privateKeyToAccount } from 'viem/accounts';
import { beforeAll, describe, expect, it } from 'vitest';

import * as taco from '../src';
import { conditions, domains, toBytes } from '../src';
import { ConditionContext } from '../src/conditions/context';

import {
  fakeDkgRitual,
  mockDkgParticipants,
  mockGetActiveRitual,
  mockGetParticipants,
  mockMakeSessionKey,
} from './test-utils';

// Shared test variables
const message = 'this is a secret';
const ownsNFT = new conditions.predefined.erc721.ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: TEST_CHAIN_ID,
});

describe('taco', () => {
  beforeAll(async () => {
    await initialize();
  });

  it('encrypts and decrypts', async () => {
    const mockedDkg = fakeDkgFlow(FerveoVariant.precomputed, 0, 4, 4);
    const mockedDkgRitual = fakeDkgRitual(mockedDkg);
    const provider = fakeProvider(aliceSecretKeyBytes);
    const signer = provider.getSigner();
    const getFinalizedRitualSpy = mockGetActiveRitual(mockedDkgRitual);

    const messageKit = await taco.encrypt(
      provider,
      domains.DEVNET,
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
    const decryptSpy = mockTacoDecrypt(
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
    const getRitualSpy = mockGetActiveRitual(mockedDkgRitual);

    const authProvider = new tacoAuth.EIP4361AuthProvider(
      provider,
      signer,
      TEST_SIWE_PARAMS,
    );
    const conditionContext = ConditionContext.fromMessageKit(messageKit);
    conditionContext.addAuthProvider(USER_ADDRESS_PARAM_DEFAULT, authProvider);
    const decryptedMessage = await taco.decrypt(
      provider,
      domains.DEVNET,
      messageKit,
      conditionContext,
      [fakePorterUri],
    );
    expect(decryptedMessage).toEqual(toBytes(message));
    expect(getParticipantsSpy).toHaveBeenCalled();
    expect(sessionKeySpy).toHaveBeenCalled();
    expect(getRitualIdFromPublicKey).toHaveBeenCalled();
    expect(getRitualSpy).toHaveBeenCalled();
    expect(decryptSpy).toHaveBeenCalled();
  }, 15000); // test timeout 15s (TODO: not sure why this test takes so long on CI)

  it('exposes requested parameters', async () => {
    const mockedDkg = fakeDkgFlow(FerveoVariant.precomputed, 0, 4, 4);
    const mockedDkgRitual = fakeDkgRitual(mockedDkg);
    const provider = fakeProvider(aliceSecretKeyBytes);
    const signer = provider.getSigner();
    const getFinalizedRitualSpy = mockGetActiveRitual(mockedDkgRitual);

    const customParamKey = ':nftId';
    const ownsNFTWithCustomParams =
      new conditions.predefined.erc721.ERC721Ownership({
        contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
        parameters: [customParamKey],
        chain: TEST_CHAIN_ID,
      });

    const messageKit = await taco.encrypt(
      provider,
      domains.DEVNET,
      message,
      ownsNFTWithCustomParams,
      mockedDkg.ritualId,
      signer,
    );
    expect(getFinalizedRitualSpy).toHaveBeenCalled();

    const conditionContext = ConditionContext.fromMessageKit(messageKit);
    const requestedParameters = conditionContext.requestedContextParameters;
    expect(requestedParameters).toEqual(
      new Set([customParamKey, USER_ADDRESS_PARAM_DEFAULT]),
    );
  });

  describe('encryptWithPublicKey', () => {
    it('encrypts with ethers.Signer', async () => {
      const mockedDkg = fakeDkgFlow(FerveoVariant.precomputed, 0, 4, 4);
      const provider = fakeProvider(aliceSecretKeyBytes);
      const signer = provider.getSigner();

      const messageKit = await taco.encryptWithPublicKey(
        message,
        ownsNFT,
        mockedDkg.dkg.publicKey(),
        signer,
      );

      expect(messageKit).toBeDefined();
      expect(messageKit).toBeInstanceOf(Object);
    });

    it('encrypts with viem Account', async () => {
      const mockedDkg = fakeDkgFlow(FerveoVariant.precomputed, 0, 4, 4);

      // Mock viem account
      const privateKey =
        '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
      const viemAccount = privateKeyToAccount(privateKey);
      const messageKit = await taco.encryptWithPublicKey(
        message,
        ownsNFT,
        mockedDkg.dkg.publicKey(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        viemAccount,
      );

      expect(messageKit).toBeDefined();
      expect(messageKit).toBeInstanceOf(Object);
    });
  });
});
