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
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { conditions, domains, toBytes } from '../src';
import { ConditionContext } from '../src/conditions/context';
import { decrypt, encrypt } from '../src/taco';

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

  describe('TACo encryption/decryption workflow', () => {
    it('encrypts and decrypts using viem functions', async () => {
      const mockedDkg = fakeDkgFlow(FerveoVariant.precomputed, 0, 4, 4);
      const mockedDkgRitual = fakeDkgRitual(mockedDkg);

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

      const privateKey =
        '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
      const viemAccount = privateKeyToAccount(privateKey);

      const mockViemProvider = {
        ...fakeProvider(aliceSecretKeyBytes),
        publicClient: mockViemPublicClient, // Add the required viem property
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      const createTacoProviderSpy = vi
        .spyOn(await import('@nucypher/shared'), 'toEthersProvider')
        .mockReturnValue(mockViemProvider);
      const createTacoSignerSpy = vi.spyOn(
        await import('@nucypher/shared'),
        'toTACoSigner',
      );

      const getFinalizedRitualSpy = mockGetActiveRitual(mockedDkgRitual);

      // Test encryption
      const messageKit = await encrypt(
        mockViemPublicClient,
        domains.DEVNET,
        message,
        ownsNFT,
        mockedDkg.ritualId,
        viemAccount,
      );

      expect(createTacoProviderSpy).toHaveBeenCalledWith(mockViemPublicClient);
      expect(createTacoSignerSpy).toHaveBeenCalledWith(viemAccount);
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
        viemAccount,
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
      createTacoProviderSpy.mockRestore();
      createTacoSignerSpy.mockRestore();
    });
  });
});
