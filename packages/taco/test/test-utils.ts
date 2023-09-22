// Disabling some of the eslint rules for convenience.
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  AggregatedTranscript,
  DecryptionShareSimple,
  Dkg,
  FerveoVariant,
  Keypair,
  SessionSecretFactory,
  SessionStaticSecret,
  ThresholdMessageKit,
  Transcript,
  Validator,
  ValidatorMessage,
} from '@nucypher/nucypher-core';
import {
  ConditionExpression,
  DkgParticipant,
  DkgRitualState,
  toBytes,
  toHexString,
  zip,
} from '@nucypher/shared';
import {
  fakeConditionExpr,
  fakeDkgFlow,
  fakeTDecFlow,
} from '@nucypher/test-utils';
import { keccak256 } from 'ethers/lib/utils';
import { SpyInstance, vi } from 'vitest';

import { DkgClient, DkgRitual } from '../src/dkg';
import { encryptMessageCbd } from '../src/tdec';

export const fakeDkgTDecFlowE2E: (
  ritualId?: number,
  variant?: FerveoVariant,
  conditionExpr?: ConditionExpression,
  message?: Uint8Array,
  sharesNum?: number,
  threshold?: number,
) => {
  dkg: Dkg;
  serverAggregate: AggregatedTranscript;
  sharesNum: number;
  transcripts: Transcript[];
  validatorKeypairs: Keypair[];
  validators: Validator[];
  ritualId: number;
  threshold: number;
  receivedMessages: ValidatorMessage[];
  message: Uint8Array;
  thresholdMessageKit: ThresholdMessageKit;
  decryptionShares: DecryptionShareSimple[];
} = (
  ritualId = 0,
  variant: FerveoVariant = FerveoVariant.precomputed,
  conditionExpr: ConditionExpression = fakeConditionExpr(),
  message = toBytes('fake-message'),
  sharesNum = 4,
  threshold = 4,
) => {
  const ritual = fakeDkgFlow(variant, ritualId, sharesNum, threshold);
  const dkgPublicKey = ritual.dkg.publicKey();
  const thresholdMessageKit = encryptMessageCbd(
    message,
    dkgPublicKey,
    conditionExpr,
  );

  const { decryptionShares } = fakeTDecFlow({
    ...ritual,
    message,
    dkgPublicKey,
    thresholdMessageKit,
  });

  return {
    ...ritual,
    message,
    decryptionShares,
    thresholdMessageKit,
  };
};

export const mockCoordinatorRitual = async (
  ritualId: number,
): Promise<{
  aggregationMismatch: boolean;
  initTimestamp: number;
  aggregatedTranscriptHash: string;
  initiator: string;
  dkgSize: number;
  id: number;
  publicKey: { word1: string; word0: string };
  totalTranscripts: number;
  aggregatedTranscript: string;
  publicKeyHash: string;
  totalAggregations: number;
}> => {
  const ritual = await fakeDkgTDecFlowE2E();
  const dkgPkBytes = ritual.dkg.publicKey().toBytes();
  return {
    id: ritualId,
    initiator: ritual.validators[0].address.toString(),
    dkgSize: ritual.sharesNum,
    initTimestamp: 0,
    totalTranscripts: ritual.receivedMessages.length,
    totalAggregations: ritual.sharesNum, // Assuming the ritual is finished
    aggregatedTranscriptHash: keccak256(ritual.serverAggregate.toBytes()),
    aggregationMismatch: false, // Assuming the ritual is correct
    aggregatedTranscript: toHexString(ritual.serverAggregate.toBytes()),
    publicKey: {
      word0: toHexString(dkgPkBytes.slice(0, 32)),
      word1: toHexString(dkgPkBytes.slice(32, 48)),
    },
    publicKeyHash: keccak256(ritual.dkg.publicKey().toBytes()),
  };
};

export const mockDkgParticipants = (
  ritualId: number,
): {
  participants: DkgParticipant[];
  participantSecrets: Record<string, SessionStaticSecret>;
} => {
  const ritual = fakeDkgTDecFlowE2E(ritualId);
  const label = toBytes(`${ritualId}`);

  const participantSecrets: Record<string, SessionStaticSecret> =
    Object.fromEntries(
      ritual.validators.map(({ address }) => {
        const participantSecret = SessionSecretFactory.random().makeKey(label);
        return [address.toString(), participantSecret];
      }),
    );

  const participants: DkgParticipant[] = zip(
    Object.entries(participantSecrets),
    ritual.transcripts,
  ).map(([[address, secret], transcript]) => {
    return {
      provider: address,
      aggregated: true, // Assuming all validators already contributed to the aggregate
      transcript,
      decryptionRequestStaticKey: secret.publicKey(),
    } as DkgParticipant;
  });
  return { participantSecrets, participants };
};

export const mockRitualId = 0;

export const fakeDkgRitual = (ritual: {
  dkg: Dkg;
  sharesNum: number;
  threshold: number;
}) => {
  return new DkgRitual(
    mockRitualId,
    ritual.dkg.publicKey(),
    ritual.sharesNum,
    ritual.threshold,
    DkgRitualState.FINALIZED,
  );
};

export const mockGetRitual = (dkgRitual: DkgRitual): SpyInstance => {
  return vi.spyOn(DkgClient, 'getRitual').mockImplementation(() => {
    return Promise.resolve(dkgRitual);
  });
};

export const mockGetFinalizedRitualSpy = (
  dkgRitual: DkgRitual,
): SpyInstance => {
  return vi.spyOn(DkgClient, 'getFinalizedRitual').mockImplementation(() => {
    return Promise.resolve(dkgRitual);
  });
};
