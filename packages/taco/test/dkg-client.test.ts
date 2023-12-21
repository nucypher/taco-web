import { DkgCoordinatorAgent } from '@nucypher/shared';
import { fakePublicClient } from '@nucypher/test-utils';
import { beforeAll, describe, expect, it } from 'vitest';

import { domains, initialize } from '../src';

import {
  fakeRitualId,
  mockDkgParticipants,
  mockGetParticipants,
  mockGetRitual,
} from './test-utils';

describe('DkgCoordinatorAgent', () => {
  beforeAll(async () => {
    await initialize();
  });

  it('fetches transcripts from the coordinator', async () => {
    const getRitualSpy = mockGetRitual();
    const ritual = await DkgCoordinatorAgent.getRitual(
      fakePublicClient,
      domains.TEST_DOMAIN,
      fakeRitualId,
    );
    expect(ritual).toBeDefined();
    expect(getRitualSpy).toHaveBeenCalled();
  });

  it('fetches participants from the coordinator', async () => {
    const getParticipantsSpy = mockGetParticipants(
      (await mockDkgParticipants(fakeRitualId)).participants,
    );
    const participants = await DkgCoordinatorAgent.getParticipants(
      fakePublicClient,
      domains.TEST_DOMAIN,
      fakeRitualId,
    );
    expect(getParticipantsSpy).toHaveBeenCalled();
    expect(participants.length).toBeGreaterThan(0);
  });
});

// TODO: Fix this test after the DkgClient.verifyRitual() method is implemented
// describe('DkgClient', () => {
//   it('verifies the dkg ritual', async () => {
//     const provider = fakeWeb3Provider(SecretKey.random().toBEBytes());
//
//     const dkgClient = new DkgClient(fakePublicClient);
//     const isValid = await dkgClient.verifyRitual(fakeRitualId);
//     expect(isValid).toBeTruthy();
//   });
// });
