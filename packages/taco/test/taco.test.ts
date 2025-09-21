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
  fakeViemAccount,
  fakeViemPublicClient,
  mockGetRitualIdFromPublicKey,
  mockTacoDecrypt,
  TEST_CHAIN_ID,
  TEST_SIWE_PARAMS,
} from '@nucypher/test-utils';
import { ethers } from 'ethers';
import type { Account, PublicClient } from 'viem';
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

// Test fixtures
const TEST_MESSAGE = 'this is a secret';
const TEST_NFT_CONTRACT = '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77';
const TEST_NFT_TOKEN_ID = 3591;

const ownsNFT = new conditions.predefined.erc721.ERC721Ownership({
  contractAddress: TEST_NFT_CONTRACT,
  parameters: [TEST_NFT_TOKEN_ID],
  chain: TEST_CHAIN_ID,
});

describe('TACo SDK', () => {
  beforeAll(async () => {
    await initialize();
  });

  describe.each<
    | ['ethers', () => ethers.providers.Provider, () => ethers.Signer]
    | ['viem', () => PublicClient, () => Account]
  >([
    [
      'ethers',
      () => fakeProvider(aliceSecretKeyBytes),
      () => fakeProvider(aliceSecretKeyBytes).getSigner(),
    ],
    [
      'viem',
      () => fakeViemPublicClient(TEST_CHAIN_ID, 'polygon-amoy'),
      () => fakeViemAccount(aliceSecretKeyBytes),
    ],
  ])('Provider: %s', (providerType, createProvider, createSigner) => {
    it('should encrypt and decrypt a message with conditions', async () => {
      // Setup
      const mockedDkg = fakeDkgFlow(FerveoVariant.precomputed, 0, 4, 4);
      const mockedDkgRitual = fakeDkgRitual(mockedDkg);
      const provider = createProvider();
      const signer = createSigner();
      const getFinalizedRitualSpy = mockGetActiveRitual(mockedDkgRitual);

      // Encrypt
      const messageKit = await taco.encrypt(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provider as any,
        domains.DEVNET,
        TEST_MESSAGE,
        ownsNFT,
        mockedDkg.ritualId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signer as any,
      );
      expect(getFinalizedRitualSpy).toHaveBeenCalled();

      // Setup decryption mocks
      const { decryptionShares } = fakeTDecFlow({
        ...mockedDkg,
        message: toBytes(TEST_MESSAGE),
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

      // Setup authentication
      const authProvider = new tacoAuth.EIP4361AuthProvider(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provider as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signer as any,
        TEST_SIWE_PARAMS,
      );
      const conditionContext = ConditionContext.fromMessageKit(messageKit);
      conditionContext.addAuthProvider(
        USER_ADDRESS_PARAM_DEFAULT,
        authProvider,
      );

      // Decrypt
      const decryptedMessage = await taco.decrypt(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provider as any,
        domains.DEVNET,
        messageKit,
        conditionContext,
        [fakePorterUri],
      );

      // Verify
      expect(decryptedMessage).toEqual(toBytes(TEST_MESSAGE));
      expect(getParticipantsSpy).toHaveBeenCalled();
      expect(sessionKeySpy).toHaveBeenCalled();
      expect(getRitualIdFromPublicKey).toHaveBeenCalled();
      expect(getRitualSpy).toHaveBeenCalled();
      expect(decryptSpy).toHaveBeenCalled();
    }, 15000); // Extended timeout for CI

    it('should handle custom condition parameters', async () => {
      // Setup
      const mockedDkg = fakeDkgFlow(FerveoVariant.precomputed, 0, 4, 4);
      const mockedDkgRitual = fakeDkgRitual(mockedDkg);
      const provider = createProvider();
      const signer = createSigner();
      const getFinalizedRitualSpy = mockGetActiveRitual(mockedDkgRitual);

      // Create condition with custom parameter
      const customParamKey = ':nftId';
      const ownsNFTWithCustomParams =
        new conditions.predefined.erc721.ERC721Ownership({
          contractAddress: TEST_NFT_CONTRACT,
          parameters: [customParamKey],
          chain: TEST_CHAIN_ID,
        });

      // Encrypt with custom condition
      const messageKit = await taco.encrypt(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provider as any,
        domains.DEVNET,
        TEST_MESSAGE,
        ownsNFTWithCustomParams,
        mockedDkg.ritualId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signer as any,
      );
      expect(getFinalizedRitualSpy).toHaveBeenCalled();

      // Verify parameters are exposed
      const conditionContext = ConditionContext.fromMessageKit(messageKit);
      const requestedParameters = conditionContext.requestedContextParameters;
      expect(requestedParameters).toEqual(
        new Set([customParamKey, USER_ADDRESS_PARAM_DEFAULT]),
      );
    });

    it('should encrypt with public key directly', async () => {
      // Setup
      const mockedDkg = fakeDkgFlow(FerveoVariant.precomputed, 0, 4, 4);
      const signer = createSigner();

      // Encrypt with public key
      const messageKit = await taco.encryptWithPublicKey(
        TEST_MESSAGE,
        ownsNFT,
        mockedDkg.dkg.publicKey(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signer as any,
      );

      // Verify
      expect(messageKit).toBeDefined();
      expect(messageKit).toBeInstanceOf(Object);
    });
  });
});
