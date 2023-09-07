import { SecretKey } from '@nucypher/nucypher-core';

import { DkgCoordinatorAgent } from '../../src/contracts/agents/coordinator';
import {
  fakeCoordinatorRitual,
  fakeDkgParticipants,
  fakeProvider,
  fakeRitualId,
  mockGetParticipants,
} from '../utils';

jest.mock('../../src/contracts/agents/coordinator', () => ({
  DkgCoordinatorAgent: {
    getRitual: () => Promise.resolve(fakeCoordinatorRitual(fakeRitualId)),
    getParticipants: () => Promise.resolve(fakeDkgParticipants(fakeRitualId)),
  },
}));

describe('DkgCoordinatorAgent', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches transcripts from the coordinator', async () => {
    const provider = fakeProvider(SecretKey.random().toBEBytes());
    const ritual = await DkgCoordinatorAgent.getRitual(provider, fakeRitualId);
    expect(ritual).toBeDefined();
  });

  it('fetches participants from the coordinator', async () => {
    const provider = fakeProvider(SecretKey.random().toBEBytes());
    const fakeParticipants = await fakeDkgParticipants(fakeRitualId);
    const getParticipantsSpy = mockGetParticipants(
      fakeParticipants.participants,
    );
    const participants = await DkgCoordinatorAgent.getParticipants(
      provider,
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
//     const dkgClient = new DkgClient(provider);
//     const isValid = await dkgClient.verifyRitual(fakeRitualId);
//     expect(isValid).toBeTruthy();
//   });
// });
