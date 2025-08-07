// Disabling some of the eslint rules for convenience.
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { createHash } from 'crypto';

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
  fakeProvider,
  fakeTDecFlow,
  TEST_CHAIN_ID,
  TEST_CONTRACT_ADDR,
  TEST_ECDSA_PUBLIC_KEY,
} from '@nucypher/test-utils';
import { ethers } from 'ethers';
import { MockInstance, vi } from 'vitest';

import {
  ContextVariableConditionProps,
  ContextVariableConditionType,
} from '../src/conditions/base/context-variable';
import {
  ContractConditionProps,
  ContractConditionType,
  FunctionAbiProps,
} from '../src/conditions/base/contract';
import {
  ECDSA_MESSAGE_PARAM_DEFAULT,
  ECDSA_SIGNATURE_PARAM_DEFAULT,
  ECDSACondition,
  ECDSAConditionProps,
  ECDSAConditionType,
} from '../src/conditions/base/ecdsa';
import {
  JsonApiConditionProps,
  JsonApiConditionType,
} from '../src/conditions/base/json-api';
import {
  JWT_PARAM_DEFAULT,
  JWTConditionProps,
  JWTConditionType,
} from '../src/conditions/base/jwt';
import {
  RpcConditionProps,
  RpcConditionType,
} from '../src/conditions/base/rpc';
import {
  SIGNING_CONDITION_OBJECT_CONTEXT_VAR,
  SigningObjectAbiAttributeConditionProps,
  SigningObjectAbiAttributeConditionType,
  SigningObjectAttributeConditionProps,
  SigningObjectAttributeConditionType,
} from '../src/conditions/base/signing';
import {
  TimeConditionMethod,
  TimeConditionProps,
  TimeConditionType,
} from '../src/conditions/base/time';
import {
  CompoundConditionProps,
  CompoundConditionType,
} from '../src/conditions/compound-condition';
import { ConditionExpression } from '../src/conditions/condition-expr';
import { ERC721Balance } from '../src/conditions/predefined/erc721';
import {
  JsonRpcConditionProps,
  JsonRpcConditionType,
} from '../src/conditions/schemas/json-rpc';
import {
  SequentialConditionProps,
  SequentialConditionType,
} from '../src/conditions/sequential';
import {
  BlockchainReturnValueTestProps,
  ReturnValueTestProps,
} from '../src/conditions/shared';
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
  const provider = fakeProvider();
  const thresholdMessageKit = await encryptMessage(
    message,
    dkgPublicKey,
    conditionExpr,
    provider.getSigner(),
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

export const mockGetRitual = (): MockInstance => {
  return vi.spyOn(DkgCoordinatorAgent, 'getRitual').mockImplementation(() => {
    return Promise.resolve(fakeCoordinatorRitual());
  });
};

export const mockGetActiveRitual = (dkgRitual: DkgRitual): MockInstance => {
  return vi.spyOn(DkgClient, 'getActiveRitual').mockImplementation(() => {
    return Promise.resolve(dkgRitual);
  });
};

export const mockIsEncryptionAuthorized = (
  isAuthorized = true,
): MockInstance => {
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
  value: 100.12,
};

export const testRpcReturnValueTest: BlockchainReturnValueTestProps = {
  comparator: '>',
  // test with a value that is 0.01 * 10^18 = 10000000000000000n wei
  // which is larger than Number.MAX_SAFE_INTEGER (9007199254740991)
  value: ethers.utils.parseEther('0.01').toBigInt(),
};

export const testTimeConditionObj: TimeConditionProps = {
  conditionType: TimeConditionType,
  returnValueTest: {
    comparator: '>',
    value: 100,
  },
  method: TimeConditionMethod,
  chain: TEST_CHAIN_ID,
};

export const testJsonApiConditionObj: JsonApiConditionProps = {
  conditionType: JsonApiConditionType,
  endpoint: 'https://api.example.com/data',
  parameters: {
    ids: 'ethereum',
    vs_currencies: 'usd',
  },
  query: '$.ethereum.usd',
  returnValueTest: testReturnValueTest,
};

export const testJsonRpcConditionObj: JsonRpcConditionProps = {
  conditionType: JsonRpcConditionType,
  endpoint: 'https://math.example.com/',
  method: 'subtract',
  params: [42, 23],
  query: '$.mathresult',
  returnValueTest: testReturnValueTest,
};

export const testJWTConditionObj: JWTConditionProps = {
  conditionType: JWTConditionType,
  publicKey: TEST_ECDSA_PUBLIC_KEY,
  expectedIssuer: '0xacbd',
  // subject: ':userAddress',
  // expirationWindow: 1800,
  // issuedWindow: 86400,
  jwtToken: JWT_PARAM_DEFAULT,
};

export const testECDSAConditionObj: ECDSAConditionProps = {
  conditionType: ECDSAConditionType,
  message: ECDSA_MESSAGE_PARAM_DEFAULT,
  signature: ECDSA_SIGNATURE_PARAM_DEFAULT,
  verifyingKey:
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // Test verifying key
  curve: 'SECP256k1',
};

// Test utility for creating predefined ECDSA conditions (simulates server-side creation)
// In production, these would be created by servers/admins and stored with their verifying keys
export interface TestSecp256k1ECDSAConditionInfo {
  condition: ECDSACondition;
  privateKey: string; // For test signature generation only
}

export function createTestSecp256k1ECDSACondition(
  message: string,
): TestSecp256k1ECDSAConditionInfo {
  const curve = 'SECP256k1';

  // Simulate server-side key generation for the predefined condition
  // ethers.Wallet uses SECP256k1 by default
  const testWallet = ethers.Wallet.createRandom();
  const verifyingKey = testWallet.publicKey.slice(2); // Remove '0x' prefix

  return {
    condition: new ECDSACondition({
      message: message,
      signature: ECDSA_SIGNATURE_PARAM_DEFAULT,
      verifyingKey: verifyingKey,
      curve: curve,
    }),
    privateKey: testWallet.privateKey, // For test purposes only
  };
}

export function createSignatureForTestSecp256k1ECDSACondition(
  predefinedCondition: TestSecp256k1ECDSAConditionInfo,
  messageToSign: string,
): string {
  // Create signature that matches Python backend expectations
  const messageHash = createHash('sha256')
    .update(Buffer.from(messageToSign, 'utf8'))
    .digest();
  const signingKey = new ethers.utils.SigningKey(
    predefinedCondition.privateKey,
  );
  const signature = signingKey.signDigest(messageHash);

  // Convert to hex format expected by Python (r+s format without 0x prefix)
  const rHex = signature.r.slice(2).padStart(64, '0');
  const sHex = signature.s.slice(2).padStart(64, '0');
  return rHex + sHex;
}

export const testRpcConditionObj: RpcConditionProps = {
  conditionType: RpcConditionType,
  chain: TEST_CHAIN_ID,
  method: 'eth_getBalance',
  parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77', 'latest'],
  returnValueTest: testRpcReturnValueTest,
};

export const testContextVariableConditionObj: ContextVariableConditionProps = {
  conditionType: ContextVariableConditionType,
  contextVariable: ':userAddress',
  returnValueTest: {
    comparator: 'in',
    value: [
      '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      '0x0000000000000000000000000000000000000001',
    ],
  },
};

export const testContractConditionObj: ContractConditionProps = {
  conditionType: ContractConditionType,
  contractAddress: '0x0000000000000000000000000000000000000000',
  chain: TEST_CHAIN_ID,
  standardContractType: 'ERC20',
  method: 'balanceOf',
  parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'],
  returnValueTest: testRpcReturnValueTest,
};

export const testCompoundConditionObj: CompoundConditionProps = {
  conditionType: CompoundConditionType,
  operator: 'or',
  operands: [
    testRpcConditionObj,
    testTimeConditionObj,
    testContractConditionObj,
  ],
};

export const testSequentialConditionObj: SequentialConditionProps = {
  conditionType: SequentialConditionType,
  conditionVariables: [
    {
      varName: 'rpc',
      condition: testRpcConditionObj,
    },
    {
      varName: 'time',
      condition: testTimeConditionObj,
    },
    {
      varName: 'contract',
      condition: testContractConditionObj,
    },
  ],
};

export const testSigningObjectAttributeConditionObj: SigningObjectAttributeConditionProps =
  {
    conditionType: SigningObjectAttributeConditionType,
    signingObjectContextVar: ':signingConditionObject',
    attributeName: 'value',
    returnValueTest: {
      comparator: '>',
      value: 100,
    },
  };

// some nested abi calls
export const testSigningObjectAbiAttributeConditionObj: SigningObjectAbiAttributeConditionProps =
  {
    conditionType: SigningObjectAbiAttributeConditionType,
    signingObjectContextVar: SIGNING_CONDITION_OBJECT_CONTEXT_VAR,
    attributeName: 'callData',
    abiValidation: {
      allowedAbiCalls: {
        'execute((address,uint256,bytes))': [
          {
            parameterIndex: 0,
            indexWithinTuple: 0,
            returnValueTest: {
              comparator: '==',
              value: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
            },
          },
          {
            parameterIndex: 0,
            indexWithinTuple: 2,
            nestedAbiValidation: {
              allowedAbiCalls: {
                'execute(address,uint256,bytes)': [
                  {
                    parameterIndex: 2,
                    nestedAbiValidation: {
                      allowedAbiCalls: {
                        'transfer(address,uint256)': [],
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    },
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
): MockInstance => {
  return vi
    .spyOn(DkgCoordinatorAgent, 'getParticipants')
    .mockImplementation(() => {
      return Promise.resolve(participants);
    });
};

export const UINT256_MAX = BigInt(
  '115792089237316195423570985008687907853269984665640564039457584007913129639935',
);

export const INT256_MIN = BigInt(
  '-57896044618658097711785492504343953926634992332820282019728792003956564819968',
);
