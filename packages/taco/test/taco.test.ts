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
  }, 9000); // test timeout 9s (TODO: not sure why this test takes so long on CI)

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

  it('should throw error when ethers provider is used with viem account', async () => {
    const ethersProvider = fakeProvider(aliceSecretKeyBytes);

    // Mock viem account (no provider property, distinguishes from ethers.Signer)
    const mockViemAccount = {
      address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
      signMessage: () => Promise.resolve('0x'),
      signTypedData: () => Promise.resolve('0x'),
    };

    // Should throw type mismatch error
    await expect(
      taco.encrypt(
        ethersProvider, // ethers provider
        domains.DEVNET,
        message,
        ownsNFT,
        0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockViemAccount as any, // viem account - MISMATCH!
      ),
    ).rejects.toThrow(
      'Type mismatch: ethers.Provider provided but viem Account detected',
    );
  });

  it('should throw error when viem client is used with ethers signer', async () => {
    const ethersProvider = fakeProvider(aliceSecretKeyBytes);
    const ethersSigner = ethersProvider.getSigner();

    // Mock viem client (chain property makes isViemClient return true)
    const mockViemClient = {
      chain: { id: 80002, name: 'polygon-amoy' },
      getChainId: () => Promise.resolve(80002),
    };

    // Should throw type mismatch error
    await expect(
      taco.encrypt(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockViemClient as any, // viem client
        domains.DEVNET,
        message,
        ownsNFT,
        0,
        ethersSigner, // ethers signer - MISMATCH!
      ),
    ).rejects.toThrow(
      'Type mismatch: viem PublicClient provided but ethers.Signer detected',
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
      const mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: () => Promise.resolve('0x'),
        signTypedData: () => Promise.resolve('0x'),
      };

      const messageKit = await taco.encryptWithPublicKey(
        message,
        ownsNFT,
        mockedDkg.dkg.publicKey(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockViemAccount as any,
      );

      expect(messageKit).toBeDefined();
      expect(messageKit).toBeInstanceOf(Object);
    });
  });
});
