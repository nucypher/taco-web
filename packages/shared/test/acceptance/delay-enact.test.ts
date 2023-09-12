import {
  bytesEqual,
  fakeAlice,
  fakePorterUri,
  fakeProvider,
  fakeRemoteBob,
  fakeSigner,
  fakeUrsulas,
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockGetUrsulas,
  mockPublishToBlockchain,
} from '../utils';
import { test } from 'vitest';

test('story: alice creates a policy but someone else enacts it', () => {
  const threshold = 2;
  const shares = 3;
  const startDate = new Date();
  const endDate = new Date(Date.now() + 60 * 1000); // 60s later
  const mockedUrsulas = fakeUrsulas(shares);
  const label = 'fake-data-label';
  const provider = fakeProvider();
  const signer = fakeSigner();

  test('alice generates a new policy', async () => {
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
      provider,
      fakePorterUri,
      policyParams,
    );
    expect(
      bytesEqual(
        preEnactedPolicy.aliceVerifyingKey.toCompressedBytes(),
        alice.verifyingKey.toCompressedBytes(),
      ),
    ).toBeTruthy();
    expect(preEnactedPolicy.label).toBe(label);

    const enacted = await preEnactedPolicy.enact(provider, signer);
    expect(enacted.txHash).toBeDefined();

    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
  });
});
