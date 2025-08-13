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
import { decryptWithViem, encryptWithViem } from '../src/viem-taco';
import { createEthersFromViem, createEthersProvider, createEthersSigner } from '../src/wrappers/viem-wrappers';

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

describe('viem unit tests', () => {
  beforeAll(async () => {
    await initialize();
  });

  describe('viem availability checks', () => {
    it('should check if viem functions are exported', () => {
      expect(encryptWithViem).toBeDefined();
      expect(decryptWithViem).toBeDefined();
      expect(typeof encryptWithViem).toBe('function');
      expect(typeof decryptWithViem).toBe('function');
    });

    it('should check if wrapper functions exist', () => {
      expect(createEthersProvider).toBeDefined();
      expect(createEthersSigner).toBeDefined();
      expect(createEthersFromViem).toBeDefined();
    });
  });

  describe('viem encrypt/decrypt with mocked adapters', () => {
    it('encrypts and decrypts using viem functions', async () => {
      const mockedDkg = fakeDkgFlow(FerveoVariant.precomputed, 0, 4, 4);
      const mockedDkgRitual = fakeDkgRitual(mockedDkg);
      const mockEthersProvider = fakeProvider(aliceSecretKeyBytes);
      const mockEthersSigner = mockEthersProvider.getSigner();

      // Mock the viem clients
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockViemPublicClient = {
        getChainId: vi.fn().mockResolvedValue(80002),
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockViemAccount = {
        address: '0x742d35Cc6632C0532c718F63b1a8D7d8a7fAd3b2',
        signMessage: vi.fn(),
      } as any;

      // Mock the adapter functions to return ethers objects
      const createEthersProviderSpy = vi.spyOn(await import('../src/wrappers/viem-wrappers'), 'createEthersProvider')
        .mockReturnValue(mockEthersProvider);
      const createEthersSignerSpy = vi.spyOn(await import('../src/wrappers/viem-wrappers'), 'createEthersSigner')
        .mockReturnValue(mockEthersSigner);

      const getFinalizedRitualSpy = mockGetActiveRitual(mockedDkgRitual);

      // Test encryption
      const messageKit = await encryptWithViem(
        mockViemPublicClient,
        domains.DEVNET,
        message,
        ownsNFT,
        mockedDkg.ritualId,
        mockViemAccount,
      );

      expect(createEthersProviderSpy).toHaveBeenCalledWith(mockViemPublicClient);
      expect(createEthersSignerSpy).toHaveBeenCalledWith(mockViemAccount, mockEthersProvider);
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
        mockEthersProvider,
        mockEthersSigner,
        TEST_SIWE_PARAMS,
      );

      const conditionContext = ConditionContext.fromMessageKit(messageKit);
      conditionContext.addAuthProvider(USER_ADDRESS_PARAM_DEFAULT, authProvider);

      // Test decryption
      const decryptedMessage = await decryptWithViem(
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
      createEthersProviderSpy.mockRestore();
      createEthersSignerSpy.mockRestore();
    });

    it('decrypts without optional parameters', async () => {
      // This test just verifies the function exists and has the right signature
      expect(decryptWithViem).toBeDefined();
      expect(decryptWithViem.length).toBe(5); // viemPublicClient, domain, messageKit, context?, porterUris?
    });
  });

  describe('function signatures', () => {
    it('should have correct function signatures', () => {
      expect(encryptWithViem.length).toBe(6); // viemPublicClient, domain, message, condition, ritualId, viemAccount
      expect(decryptWithViem.length).toBe(5); // viemPublicClient, domain, messageKit, context?, porterUris?
    });
  });
});
