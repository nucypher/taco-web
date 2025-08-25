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
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { conditions, domains, toBytes } from '../src';
import { ConditionContext } from '../src/conditions/context';
import { decrypt, encrypt } from '../src/viem-taco';


import {
  fakeDkgRitual,
  mockDkgParticipants,
  mockGetActiveRitual,
  mockGetParticipants,
  mockMakeSessionKey,
} from './test-utils';

// Shared test variables
const message = 'this is a secret viem message';
const ownsNFT = new conditions.predefined.erc721.ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: TEST_CHAIN_ID,
});

describe('viem TACo integration', () => {
  beforeAll(async () => {
    await initialize();
  });

  describe('viem TACo functions', () => {
    it('should export viem TACo integration functions', () => {
      expect(encrypt).toBeDefined();
      expect(decrypt).toBeDefined();
      expect(typeof encrypt).toBe('function');
      expect(typeof decrypt).toBe('function');
    });
  });

  describe('TACo encryption workflow', () => {
    it('encrypts and decrypts using viem functions', async () => {
      const mockedDkg = fakeDkgFlow(FerveoVariant.precomputed, 0, 4, 4);
      const mockedDkgRitual = fakeDkgRitual(mockedDkg);
      const mockEthersProvider = fakeProvider(aliceSecretKeyBytes);
      const mockEthersSigner = {
        ...mockEthersProvider.getSigner(),
        signTypedData: vi.fn().mockResolvedValue('0x'),
      };
      // Type assertion for test compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typedSigner = mockEthersSigner as any;

      // Mock the viem clients with more complete interfaces
      const mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
        call: vi.fn().mockResolvedValue('0x'),
        getNetwork: vi
          .fn()
          .mockResolvedValue({ chainId: 80002, name: 'polygon-amoy' }),
        readContract: vi.fn().mockResolvedValue('0x'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn().mockResolvedValue('0x'),
        signTypedData: vi.fn().mockResolvedValue('0x'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const mockViemProvider = {
        ...fakeProvider(aliceSecretKeyBytes),
        viemPublicClient: mockViemPublicClient, // Add the required viem property
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const createTacoCompatibleProviderSpy = vi
        .spyOn(
          await import('../src/wrappers/viem-adapters'),
          'createTacoCompatibleProvider',
        )
        .mockResolvedValue(mockViemProvider);
      const createTacoCompatibleSignerSpy = vi
        .spyOn(
          await import('../src/wrappers/viem-adapters'),
          'createTacoCompatibleSigner',
        )
        .mockResolvedValue(typedSigner);

      const getFinalizedRitualSpy = mockGetActiveRitual(mockedDkgRitual);

      // Test encryption
      const messageKit = await encrypt(
        mockViemPublicClient,
        domains.DEVNET,
        message,
        ownsNFT,
        mockedDkg.ritualId,
        mockViemAccount,
      );

      expect(createTacoCompatibleProviderSpy).toHaveBeenCalledWith(
        mockViemPublicClient,
      );
      expect(createTacoCompatibleSignerSpy).toHaveBeenCalledWith(
        mockViemAccount,
        mockViemProvider,
      );
      expect(getFinalizedRitualSpy).toHaveBeenCalled();
      expect(messageKit).toBeDefined();

      // Setup decryption mocks
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
        mockViemProvider,
        typedSigner,
        TEST_SIWE_PARAMS,
      );

      const conditionContext = ConditionContext.fromMessageKit(messageKit);
      conditionContext.addAuthProvider(
        USER_ADDRESS_PARAM_DEFAULT,
        authProvider,
      );

      // Test decryption
      const decryptedMessage = await decrypt(
        mockViemPublicClient,
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

      // Clean up spies
      createTacoCompatibleProviderSpy.mockRestore();
      createTacoCompatibleSignerSpy.mockRestore();
    });

    it('decrypts without optional parameters', async () => {
      // This test just verifies the function exists and has the right signature
      expect(decrypt).toBeDefined();
      expect(decrypt.length).toBe(5); // viemPublicClient, domain, messageKit, context?, porterUris?
    });
  }, 10000);

  describe('function signatures', () => {
    it('should have correct function signatures', () => {
      expect(encrypt.length).toBe(6); // viemPublicClient, domain, message, condition, ritualId, viemAccount
      expect(decrypt.length).toBe(5); // viemPublicClient, domain, messageKit, context?, porterUris?
    });
  });
});
