import { SecretKey } from '@nucypher/nucypher-core';

import { DkgCoordinatorAgent } from '../../src';
import {
  fakeProvider,
  mockCoordinatorRitual,
  mockDkgParticipants,
  mockGetParticipants,
  mockRitualId,
} from '../utils';

jest.mock('../../src/contracts/agents/coordinator', () => ({
  DkgCoordinatorAgent: {
    getRitual: () => Promise.resolve(mockCoordinatorRitual(mockRitualId)),
    getParticipants: () => Promise.resolve(mockDkgParticipants(mockRitualId)),
  },
}));

describe('DkgCoordinatorAgent', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches transcripts from the coordinator', async () => {
    const provider = fakeProvider(SecretKey.random().toBEBytes());
    const ritual = await DkgCoordinatorAgent.getRitual(provider, mockRitualId);
    expect(ritual).toBeDefined();
  });

  it('fetches participants from the coordinator', async () => {
    const provider = fakeProvider(SecretKey.random().toBEBytes());
    const fakeParticipants = await mockDkgParticipants(mockRitualId);
    const getParticipantsSpy = mockGetParticipants(
      fakeParticipants.participants,
    );
    const participants = await DkgCoordinatorAgent.getParticipants(
      provider,
      mockRitualId,
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
//     const dkgClient = new DkgClient(provider);
//     const isValid = await dkgClient.verifyRitual(fakeRitualId);
//     expect(isValid).toBeTruthy();
//   });
// });
