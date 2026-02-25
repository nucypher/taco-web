import { SessionStaticSecret } from '@nucypher/nucypher-core';
import { initialize } from '@nucypher/shared';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { SigningCoordinatorAgent } from '../src/contracts/agents/signing-coordinator';
import { toHexString } from '../src/utils';

// We need to mock the private connectReadOnly method's dependencies
// Mock getContract from nucypher-contracts and the factory
vi.mock('@nucypher/nucypher-contracts', () => ({
  getContract: vi.fn().mockReturnValue('0xMockContractAddress'),
}));

vi.mock('../src/contracts/ethers-typechain', () => ({
  SigningCoordinator__factory: {
    connect: vi.fn(),
  },
}));

import { SigningCoordinator__factory } from '../src/contracts/ethers-typechain';

describe('SigningCoordinatorAgent cache', () => {
  const mockProvider = {
    getNetwork: vi.fn(),
  } as any;

  const domain = 'lynx' as const;
  const cohortId = 5;

  let mockContract: any;

  beforeAll(async () => {
    await initialize();
  });

  beforeEach(() => {
    vi.useFakeTimers();

    mockProvider.getNetwork.mockResolvedValue({ chainId: 11155111 });

    const signerKey = SessionStaticSecret.random();
    mockContract = {
      getSigners: vi.fn().mockResolvedValue([
        {
          provider: '0xnode1',
          signerAddress: '0x0000000000000000000000000000000000000001',
          signingRequestStaticKey: `0x${toHexString(signerKey.publicKey().toBytes())}`,
        },
      ]),
      signingCohorts: vi.fn().mockResolvedValue({ threshold: 2 }),
    };

    vi.mocked(SigningCoordinator__factory.connect).mockReturnValue(
      mockContract as any,
    );

    // Clear cache between tests
    SigningCoordinatorAgent.clearCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('caches getParticipants for same domain and cohortId', async () => {
    await SigningCoordinatorAgent.getParticipants(
      mockProvider,
      domain,
      cohortId,
    );
    await SigningCoordinatorAgent.getParticipants(
      mockProvider,
      domain,
      cohortId,
    );

    expect(mockContract.getSigners).toHaveBeenCalledTimes(1);
  });

  it('caches getThreshold for same domain and cohortId', async () => {
    await SigningCoordinatorAgent.getThreshold(mockProvider, domain, cohortId);
    await SigningCoordinatorAgent.getThreshold(mockProvider, domain, cohortId);

    expect(mockContract.signingCohorts).toHaveBeenCalledTimes(1);
  });

  it('expires cache after 60 seconds', async () => {
    await SigningCoordinatorAgent.getThreshold(mockProvider, domain, cohortId);

    vi.advanceTimersByTime(60_001);

    await SigningCoordinatorAgent.getThreshold(mockProvider, domain, cohortId);

    expect(mockContract.signingCohorts).toHaveBeenCalledTimes(2);
  });

  it('does not share cache across different cohortIds', async () => {
    await SigningCoordinatorAgent.getThreshold(mockProvider, domain, 1);
    await SigningCoordinatorAgent.getThreshold(mockProvider, domain, 2);

    expect(mockContract.signingCohorts).toHaveBeenCalledTimes(2);
  });

  it('does not share cache across different domains', async () => {
    await SigningCoordinatorAgent.getThreshold(mockProvider, 'lynx', cohortId);
    await SigningCoordinatorAgent.getThreshold(
      mockProvider,
      'mainnet',
      cohortId,
    );

    expect(mockContract.signingCohorts).toHaveBeenCalledTimes(2);
  });

  it('clearCache forces fresh fetch', async () => {
    await SigningCoordinatorAgent.getThreshold(mockProvider, domain, cohortId);
    SigningCoordinatorAgent.clearCache();
    await SigningCoordinatorAgent.getThreshold(mockProvider, domain, cohortId);

    expect(mockContract.signingCohorts).toHaveBeenCalledTimes(2);
  });
});
