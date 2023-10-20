import {
  bytesEqual,
  fakePorterUri,
  fakeProvider,
  fakeSigner,
  fakeUrsulas,
  mockGetUrsulas,
} from '@nucypher/test-utils';
import { beforeAll, describe, expect, it } from 'vitest';

import { domains, initialize } from '../../src';
import {
  fakeAlice,
  fakeRemoteBob,
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockPublishToBlockchain,
} from '../utils';

describe('story: alice creates a policy but someone else enacts it', () => {
  const threshold = 2;
  const shares = 3;
  const startDate = new Date();
  const endDate = new Date(Date.now() + 60 * 1000); // 60s later
  const label = 'fake-data-label';

  describe('verifies capsule frags', async () => {
    beforeAll(async () => {
      await initialize();
    });

    it('alice generates a new policy', async () => {
      const provider = fakeProvider();
      const getUrsulasSpy = mockGetUrsulas(fakeUrsulas(shares));
      const generateKFragsSpy = mockGenerateKFrags();
      const publishToBlockchainSpy = mockPublishToBlockchain();
      const encryptTreasureMapSpy = mockEncryptTreasureMap();

      const alice = fakeAlice('fake-secret-key-32-bytes-alice-1');
      const policyParams = {
        bob: fakeRemoteBob(),
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

      const enacted = await preEnactedPolicy.enact(
        provider,
        fakeSigner(),
        domains.DEV,
      );
      expect(enacted.txHash).toBeDefined();

      expect(getUrsulasSpy).toHaveBeenCalled();
      expect(generateKFragsSpy).toHaveBeenCalled();
      expect(publishToBlockchainSpy).toHaveBeenCalled();
      expect(encryptTreasureMapSpy).toHaveBeenCalled();
    });
  });
});
