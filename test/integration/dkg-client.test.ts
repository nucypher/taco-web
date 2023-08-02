import { SecretKey } from '@nucypher/nucypher-core';

import {
  DkgCoordinatorAgent,
  DkgRitualState,
} from '../../src/agents/coordinator';
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

  it('waits until the ritual end time during initialization', async () => {
    jest.useFakeTimers();
    const fakeProvider = fakeWeb3Provider(SecretKey.random().toBEBytes());
    const fakeUrsulas = ['ursula1', 'ursula2', 'ursula3'];
    const fakeRitualId = 123;
    const initTimestamp = Math.floor(Date.now() / 1000);
    const timeout = 10;

    jest
      .spyOn(DkgCoordinatorAgent, 'initializeRitual')
      .mockResolvedValue(fakeRitualId);

    jest
      .spyOn(DkgCoordinatorAgent, 'getRitualInitTime')
      .mockResolvedValue(initTimestamp);

    jest.spyOn(DkgCoordinatorAgent, 'getTimeout').mockResolvedValue(timeout);

    jest.spyOn(DkgClient as any, 'performRitual').mockResolvedValue(undefined);

    const promise = DkgClient.initializeRitual(fakeProvider, fakeUrsulas, true);

    jest.advanceTimersByTime(timeout * 1000);

    await expect(promise).resolves.toBe(fakeRitualId);

    expect(DkgCoordinatorAgent.initializeRitual).toHaveBeenCalledWith(
      fakeProvider,
      fakeUrsulas
    );

    expect(DkgCoordinatorAgent.getRitualInitTime).toHaveBeenCalledWith(
      fakeProvider,
      fakeRitualId
    );

    expect(DkgCoordinatorAgent.getTimeout).toHaveBeenCalledWith(fakeProvider);

    expect((DkgClient as any).performRitual).toHaveBeenCalledWith(
      fakeProvider,
      fakeRitualId
    );
  });

  it('throws an error when initialization times out', async () => {
    jest.useFakeTimers();
    const fakeProvider = fakeWeb3Provider(SecretKey.random().toBEBytes());
    const fakeUrsulas = ['ursula1', 'ursula2', 'ursula3'];
    const fakeRitualId = 123;
    const initTimestamp = Math.floor(Date.now() / 1000);
    const timeout = 10;

    jest
      .spyOn(DkgCoordinatorAgent, 'initializeRitual')
      .mockResolvedValue(fakeRitualId);

    jest
      .spyOn(DkgCoordinatorAgent, 'getRitualInitTime')
      .mockResolvedValue(initTimestamp);

    jest.spyOn(DkgCoordinatorAgent, 'getTimeout').mockResolvedValue(timeout);

    const performRitualSpy = jest
      .spyOn(DkgClient as any, 'performRitual')
      .mockRejectedValue(
        new Error(`Ritual initialization failed. Ritual id ${fakeRitualId}`)
      );

    jest
      .spyOn(DkgCoordinatorAgent, 'getRitualState')
      .mockResolvedValue(DkgRitualState.TIMEOUT);

    const promise = DkgClient.initializeRitual(fakeProvider, fakeUrsulas, true);

    jest.advanceTimersByTime(timeout * 1000);

    await expect(promise).rejects.toThrow(
      `Ritual initialization failed. Ritual id ${fakeRitualId} is in state TIMEOUT`
    );

    expect(DkgCoordinatorAgent.initializeRitual).toHaveBeenCalledWith(
      fakeProvider,
      fakeUrsulas
    );

    expect(DkgCoordinatorAgent.getRitualInitTime).toHaveBeenCalledWith(
      fakeProvider,
      fakeRitualId
    );

    expect(DkgCoordinatorAgent.getTimeout).toHaveBeenCalledWith(fakeProvider);

    expect(performRitualSpy).toHaveBeenCalledWith(fakeProvider, fakeRitualId);
  });
});
