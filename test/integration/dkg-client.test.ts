import { SecretKey } from '@nucypher/nucypher-core';

import { DkgCoordinatorAgent } from '../../src/agents/coordinator';
import { DkgClient } from '../../src/dkg';
import { fakeDkgParticipants, fakeDkgRitual, fakeWeb3Provider } from '../utils';

const ritualId = 0;

jest.mock('../../src/agents/coordinator', () => ({
  DkgCoordinatorAgent: {
    getRitual: () => Promise.resolve(fakeDkgRitual(ritualId)),
    getParticipants: () => Promise.resolve(fakeDkgParticipants()),
  },
}));

describe('DkgCoordinatorAgent', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches transcripts from the coordinator', async () => {
    const provider = fakeWeb3Provider(SecretKey.random().toBEBytes());
    const ritual = await DkgCoordinatorAgent.getRitual(provider, ritualId);

    expect(ritual.id).toEqual(ritualId);
  });

  it('fetches participants from the coordinator', async () => {
    const provider = fakeWeb3Provider(SecretKey.random().toBEBytes());
    const participants = await DkgCoordinatorAgent.getParticipants(
      provider,
      ritualId
    );

    expect(participants.length).toBeGreaterThan(0);
  });
});

describe('DkgClient', () => {
  it('verifies the dkg ritual', async () => {
    const provider = fakeWeb3Provider(SecretKey.random().toBEBytes());

    const dkgClient = new DkgClient(provider, ritualId);
    const isValid = await dkgClient.verifyRitual();
    expect(isValid).toBe(true);
  });
});
