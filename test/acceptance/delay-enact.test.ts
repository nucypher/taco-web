import {
  bytesEqual,
  fakeAlice,
  fakeRemoteBob,
  fakeUrsulas,
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockGetUrsulas,
  mockPublishToBlockchain,
} from '../utils';

describe('story: alice1 creates a policy but alice2 enacts it', () => {
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

    const alice1 = fakeAlice('fake-secret-key-32-bytes-alice-1');
    const alice2 = fakeAlice('fake-secret-key-32-bytes-alice-2');
    const bob = fakeRemoteBob();
    const policyParams = {
      bob,
      label,
      threshold,
      shares,
      startDate,
      endDate,
    };

    const preEnactedPolicy = await alice1.generatePreEnactedPolicy(
      policyParams
    );
    expect(
      bytesEqual(
        preEnactedPolicy.aliceVerifyingKey.toCompressedBytes(),
        alice1.verifyingKey.toCompressedBytes()
      )
    ).toBeTruthy();
    expect(preEnactedPolicy.label).toBe(label);

    const enacted = await preEnactedPolicy.enact(alice2);
    expect(enacted.txHash).toBeDefined();

    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
  });
});
