import {
  mockAlice,
  mockConstructTreasureMap,
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockGetUrsulas,
  mockPublishToBlockchain,
  mockRemoteBob,
  mockStakingEscrow,
  mockUrsulas,
} from '../utils';

describe('story: alice1 creates a policy but alice2 enacts it', () => {
  const threshold = 2;
  const shares = 3;
  const paymentPeriods = 3;
  const expiration = new Date(Date.now() + 60 * 1000);
  const rate = 1;
  const mockedUrsulas = mockUrsulas().slice(0, shares);
  const label = 'fake-data-label';

  it('alice generates a new policy', async () => {
    mockStakingEscrow();
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const constructTreasureMapSpy = mockConstructTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const alice1 = mockAlice('fake-secret-key-32-bytes-alice-1');
    const alice2 = mockAlice('fake-secret-key-32-bytes-alice-2');
    const bob = mockRemoteBob();
    const policyParams = {
      bob,
      label,
      threshold,
      shares,
      expiration,
      paymentPeriods,
      rate,
    };

    const preEnactedPolicy = await alice1.generatePreEnactedPolicy(
      policyParams
    );
    expect(preEnactedPolicy.aliceVerifyingKey).toEqual(
      alice1.verifyingKey.toBytes()
    );
    expect(preEnactedPolicy.label).toBe(label);

    const enacted = await preEnactedPolicy.enact(alice2);
    expect(enacted.txHash).toBeDefined();

    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
    expect(constructTreasureMapSpy).toHaveBeenCalled();
  });
});
