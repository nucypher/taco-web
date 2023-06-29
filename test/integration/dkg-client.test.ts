import { SecretKey } from '@nucypher/nucypher-core';

import { DkgCoordinatorAgent } from '../../src/agents/coordinator';
import { DkgClient } from '../../src/dkg';
import {
  fakeCoordinatorRitual,
  fakeDkgParticipants,
  fakeRitualId,
  fakeWeb3Provider,
  mockGetParticipantPublicKey,
  mockGetParticipants,
  mockVerifyRitual,
} from '../utils';

jest.mock('../../src/agents/coordinator', () => ({
  DkgCoordinatorAgent: {
    getRitual: () => Promise.resolve(fakeCoordinatorRitual(fakeRitualId)),
    getParticipants: () =>
      Promise.resolve(fakeDkgParticipants(fakeRitualId).participants),
  },
}));

describe('DkgCoordinatorAgent', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches transcripts from the coordinator', async () => {
    const provider = fakeWeb3Provider(SecretKey.random().toBEBytes());
    const ritual = await DkgCoordinatorAgent.getRitual(provider, fakeRitualId);
    expect(ritual).toBeDefined();
  });

  it('fetches participants from the coordinator', async () => {
    const provider = fakeWeb3Provider(SecretKey.random().toBEBytes());
    const fakeParticipants = fakeDkgParticipants(fakeRitualId);
    const getParticipantsSpy = mockGetParticipants(
      fakeParticipants.participants
    );
    const participants = await DkgCoordinatorAgent.getParticipants(
      provider,
      fakeRitualId
    );
    expect(getParticipantsSpy).toHaveBeenCalled();
    expect(participants.length).toBeGreaterThan(0);
  });
});

describe('DkgClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('verifies the dkg ritual', async () => {
    const provider = fakeWeb3Provider(SecretKey.random().toBEBytes());
    const verifyRitualSpy = mockVerifyRitual();

    const isValid = await DkgClient.verifyRitual(provider, fakeRitualId);
    expect(isValid).toBeTruthy();
    expect(verifyRitualSpy).toHaveBeenCalled();
  });

  it('rejects on missing participant pk', async () => {
    const provider = fakeWeb3Provider(SecretKey.random().toBEBytes());

    await expect(async () =>
      DkgClient.verifyRitual(provider, fakeRitualId)
    ).rejects.toThrow(
      'No public key for participant: 0x0000000000000000000000000000000000000000'
    );
  });

  it('rejects on bad participant pk', async () => {
    const provider = fakeWeb3Provider(SecretKey.random().toBEBytes());
    const getParticipantPublicKeysSpy = mockGetParticipantPublicKey();

    await expect(async () =>
      DkgClient.verifyRitual(provider, fakeRitualId)
    ).rejects.toThrow(
      "Transcript aggregate doesn't match the received PVSS instances"
    );
    expect(getParticipantPublicKeysSpy).toHaveBeenCalled();
  });
});
