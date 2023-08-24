import {
  bytesEqual,
  fakeAlice,
  fakePorterUri,
  fakeRemoteBob,
  fakeUrsulas,
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockGetUrsulas,
  mockPublishToBlockchain,
  testWalletClient,
} from '../utils';

jest.mock('viem/actions', () => ({
  ...jest.requireActual('viem/actions'),
  getBlock: jest.fn().mockResolvedValue({
    timestamp: 1000,
  }),
  getBlockNumber: jest.fn().mockResolvedValue(BigInt(1000)),
}));

describe('story: alice creates a policy but someone else enacts it', () => {
  const threshold = 2;
  const shares = 3;
  const startDate = new Date();
  const endDate = new Date(Date.now() + 60 * 1000); // 60s later
  const mockedUrsulas = fakeUrsulas(shares);
  const label = 'fake-data-label';

  it('alice generates a new policy', async () => {
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const alice = fakeAlice('fake-secret-key-32-bytes-alice-1');
    const bob = fakeRemoteBob();
    const policyParams = {
      bob,
      label,
      threshold,
      shares,
      startDate,
      endDate,
    };

    const preEnactedPolicy = await alice.generatePreEnactedPolicy(
      testWalletClient,
      fakePorterUri,
      policyParams
    );
    expect(
      bytesEqual(
        preEnactedPolicy.aliceVerifyingKey.toCompressedBytes(),
        alice.verifyingKey.toCompressedBytes()
      )
    ).toBeTruthy();
    expect(preEnactedPolicy.label).toBe(label);

    const enacted = await preEnactedPolicy.enact(testWalletClient);
    expect(enacted.txHash).toBeDefined();

    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
  });
});
