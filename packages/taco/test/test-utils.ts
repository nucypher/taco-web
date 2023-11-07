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
  CoordinatorRitual,
  DkgCoordinatorAgent,
  DkgParticipant,
  DkgRitualState,
  toBytes,
  toHexString,
  zip,
} from '@nucypher/shared';
import {
  fakeDkgFlow,
  fakeSigner,
  fakeTDecFlow,
  TEST_CHAIN_ID,
  TEST_CONTRACT_ADDR,
} from '@nucypher/test-utils';
import { SpyInstance, vi } from 'vitest';

import { ConditionExpression } from '../src/conditions';
import {
  ContractConditionProps,
  ContractConditionType,
  FunctionAbiProps,
  ReturnValueTestProps,
  RpcConditionProps,
  RpcConditionType,
  TimeConditionMethod,
  TimeConditionProps,
  TimeConditionType,
} from '../src/conditions/base';
import { ERC721Balance } from '../src/conditions/predefined';
import { DkgClient, DkgRitual } from '../src/dkg';
import { encryptMessage } from '../src/tdec';

export const fakeDkgTDecFlowE2E: (
  ritualId?: number,
  variant?: FerveoVariant,
  conditionExpr?: ConditionExpression,
  message?: Uint8Array,
  sharesNum?: number,
  threshold?: number,
) => Promise<{
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
}> = async (
  ritualId = 0,
  variant: FerveoVariant = FerveoVariant.precomputed,
  conditionExpr: ConditionExpression = fakeConditionExpr(),
  message = toBytes('fake-message'),
  sharesNum = 4,
  threshold = 4,
) => {
  const ritual = fakeDkgFlow(variant, ritualId, sharesNum, threshold);
  const dkgPublicKey = ritual.dkg.publicKey();
  const thresholdMessageKit = await encryptMessage(
    message,
    dkgPublicKey,
    conditionExpr,
    fakeSigner(),
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

export const fakeCoordinatorRitual = async (): Promise<CoordinatorRitual> => {
  const ritual = await fakeDkgTDecFlowE2E();
  const dkgPkBytes = ritual.dkg.publicKey().toBytes();
  return {
    initiator: ritual.validators[0].address.toString(),
    dkgSize: ritual.sharesNum,
    initTimestamp: 0,
    totalTranscripts: ritual.receivedMessages.length,
    totalAggregations: ritual.sharesNum, // Assuming the ritual is finished
    aggregationMismatch: false, // Assuming the ritual is correct
    aggregatedTranscript: toHexString(ritual.serverAggregate.toBytes()),
    publicKey: {
      word0: toHexString(dkgPkBytes.slice(0, 32)),
      word1: toHexString(dkgPkBytes.slice(32, 48)),
    } as [string, string] & {
      // Casting to satisfy the type checker
      word0: string;
      word1: string;
    },
    endTimestamp: 0,
    authority: '0x0',
    threshold: ritual.threshold,
    accessController: '0x0',
  };
};

export const mockDkgParticipants = async (
  ritualId: number,
): Promise<{
  participants: DkgParticipant[];
  participantSecrets: Record<string, SessionStaticSecret>;
}> => {
  const ritual = await fakeDkgTDecFlowE2E(ritualId);
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

export const fakeRitualId = 0;

export const fakeDkgRitual = (ritual: {
  dkg: Dkg;
  sharesNum: number;
  threshold: number;
}) => {
  return new DkgRitual(
    fakeRitualId,
    ritual.dkg.publicKey(),
    ritual.sharesNum,
    ritual.threshold,
    DkgRitualState.ACTIVE,
  );
};

export const mockGetRitual = (): SpyInstance => {
  return vi.spyOn(DkgCoordinatorAgent, 'getRitual').mockImplementation(() => {
    return Promise.resolve(fakeCoordinatorRitual());
  });
};

export const mockGetActiveRitual = (dkgRitual: DkgRitual): SpyInstance => {
  return vi.spyOn(DkgClient, 'getActiveRitual').mockImplementation(() => {
    return Promise.resolve(dkgRitual);
  });
};

export const mockIsEncryptionAuthorized = (
  isAuthorized = true,
): SpyInstance => {
  return vi
    .spyOn(DkgCoordinatorAgent, 'isEncryptionAuthorized')
    .mockImplementation(async () => {
      return Promise.resolve(isAuthorized);
    });
};

export const mockMakeSessionKey = (secret: SessionStaticSecret) => {
  return vi
    .spyOn(SessionStaticSecret, 'random')
    .mockImplementation(() => secret);
};

export const testReturnValueTest: ReturnValueTestProps = {
  comparator: '>',
  value: 100,
};

export const testTimeConditionObj: TimeConditionProps = {
  conditionType: TimeConditionType,
  returnValueTest: {
    comparator: '>',
    value: 100,
  },
  method: TimeConditionMethod,
  chain: 5,
};

export const testRpcConditionObj: RpcConditionProps = {
  conditionType: RpcConditionType,
  chain: TEST_CHAIN_ID,
  method: 'eth_getBalance',
  parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77', 'latest'],
  returnValueTest: testReturnValueTest,
};

export const testContractConditionObj: ContractConditionProps = {
  conditionType: ContractConditionType,
  contractAddress: '0x0000000000000000000000000000000000000000',
  chain: 5,
  standardContractType: 'ERC20',
  method: 'balanceOf',
  parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'],
  returnValueTest: testReturnValueTest,
};

export const testFunctionAbi: FunctionAbiProps = {
  name: 'myFunction',
  type: 'function',
  stateMutability: 'view',
  inputs: [
    {
      internalType: 'address',
      name: 'account',
      type: 'address',
    },
    {
      internalType: 'uint256',
      name: 'myCustomParam',
      type: 'uint256',
    },
  ],
  outputs: [
    {
      internalType: 'uint256',
      name: 'someValue',
      type: 'uint256',
    },
  ],
};

export const fakeCondition = () =>
  new ERC721Balance({
    chain: TEST_CHAIN_ID,
    contractAddress: TEST_CONTRACT_ADDR,
    returnValueTest: {
      comparator: '>=',
      value: 0,
    },
  });

export const fakeConditionExpr = () => new ConditionExpression(fakeCondition());

export const mockGetParticipants = (
  participants: DkgParticipant[],
): SpyInstance => {
  return vi
    .spyOn(DkgCoordinatorAgent, 'getParticipants')
    .mockImplementation(() => {
      return Promise.resolve(participants);
    });
};
