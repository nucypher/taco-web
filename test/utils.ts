// Disabling some of the eslint rules for convenience.
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Block } from '@ethersproject/providers';
import {
  AggregatedTranscript,
  Capsule,
  CapsuleFrag,
  Ciphertext,
  combineDecryptionSharesPrecomputed,
  combineDecryptionSharesSimple,
  DecryptionSharePrecomputed,
  DecryptionShareSimple,
  decryptWithSharedSecret,
  Dkg,
  EncryptedThresholdDecryptionResponse,
  EncryptedTreasureMap,
  EthereumAddress,
  ferveoEncrypt,
  FerveoPublicKey,
  FerveoVariant,
  Keypair,
  PublicKey,
  reencrypt,
  SecretKey,
  SessionSecretFactory,
  SessionStaticKey,
  SessionStaticSecret,
  ThresholdDecryptionResponse,
  Transcript,
  Validator,
  ValidatorMessage,
  VerifiedCapsuleFrag,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import axios from 'axios';
import { ethers, providers, Wallet } from 'ethers';
import { keccak256 } from 'ethers/lib/utils';

import { Alice, Bob, Cohort, RemoteBob } from '../src';
import {
  DkgCoordinatorAgent,
  DkgParticipant,
  DkgRitualState,
} from '../src/agents/coordinator';
import { ThresholdDecrypter } from '../src/characters/cbd-recipient';
import { DkgClient, DkgRitual } from '../src/dkg';
import { BlockchainPolicy, PreEnactedPolicy } from '../src/policies/policy';
import {
  CbdDecryptResult,
  GetUrsulasResult,
  PorterClient,
  RetrieveCFragsResult,
  Ursula,
} from '../src/porter';
import { ChecksumAddress } from '../src/types';
import { toBytes, toHexString, zip } from '../src/utils';

export const bytesEqual = (first: Uint8Array, second: Uint8Array): boolean =>
  first.length === second.length &&
  first.every((value, index) => value === second[index]);

export const fromBytes = (bytes: Uint8Array): string =>
  new TextDecoder().decode(bytes);

export const fakePorterUri = 'https://_this_should_crash.com/';

export const fakeBob = (): Bob => {
  const secretKey = SecretKey.fromBEBytes(
    toBytes('fake-secret-key-32-bytes-bob-xxx')
  );
  return Bob.fromSecretKey(secretKey);
};

export const fakeRemoteBob = (): RemoteBob => {
  const { decryptingKey, verifyingKey } = fakeBob();
  return RemoteBob.fromKeys(decryptingKey, verifyingKey);
};

export const fakeAlice = (aliceKey = 'fake-secret-key-32-bytes-alice-x') => {
  const secretKey = SecretKey.fromBEBytes(toBytes(aliceKey));
  return Alice.fromSecretKey(secretKey);
};

export const fakeWeb3Provider = (
  secretKeyBytes = SecretKey.random().toBEBytes(),
  blockNumber?: number,
  blockTimestamp?: number
): ethers.providers.Web3Provider => {
  const block = { timestamp: blockTimestamp ?? 1000 };
  const provider = {
    getBlockNumber: () => Promise.resolve(blockNumber ?? 1000),
    getBlock: () => Promise.resolve(block as Block),
    _isProvider: true,
    getNetwork: () => Promise.resolve({ name: 'mockNetwork', chainId: -1 }),
  };
  const fakeSignerWithProvider = {
    ...new Wallet(secretKeyBytes),
    provider,
    _signTypedData: () => Promise.resolve('fake-typed-signature'),
    getAddress: () =>
      Promise.resolve('0x0000000000000000000000000000000000000000'),
  } as unknown as ethers.providers.JsonRpcSigner;
  return {
    ...provider,
    getSigner: () => fakeSignerWithProvider,
  } as unknown as ethers.providers.Web3Provider;
};

const genChecksumAddress = (i: number) =>
  '0x' + '0'.repeat(40 - i.toString(16).length) + i.toString(16);
const genEthAddr = (i: number) =>
  EthereumAddress.fromString(genChecksumAddress(i));
export const fakeUrsulas = (n = 4): Ursula[] =>
  // 0...n-1
  Array.from(Array(n).keys()).map((i: number) => ({
    encryptingKey: SecretKey.random().publicKey(),
    checksumAddress: genChecksumAddress(i).toLowerCase(),
    uri: `https://example.${i}.com:9151`,
  }));

export const mockGetUrsulas = (ursulas: readonly Ursula[]) => {
  const fakePorterUrsulas = (
    mockUrsulas: readonly Ursula[]
  ): GetUrsulasResult => {
    return {
      result: {
        ursulas: mockUrsulas.map(({ encryptingKey, uri, checksumAddress }) => ({
          encrypting_key: toHexString(encryptingKey.toCompressedBytes()),
          uri: uri,
          checksum_address: checksumAddress,
        })),
      },
      version: '5.2.0',
    };
  };

  return jest.spyOn(axios, 'get').mockImplementation(async () => {
    return Promise.resolve({ data: fakePorterUrsulas(ursulas) });
  });
};
export const mockPublishToBlockchain = () => {
  const txHash = '0x1234567890123456789012345678901234567890';
  return jest
    .spyOn(PreEnactedPolicy.prototype as any, 'publish')
    .mockImplementation(async () => Promise.resolve(txHash));
};

const fakeCFragResponse = (
  ursulas: readonly ChecksumAddress[],
  verifiedKFrags: readonly VerifiedKeyFrag[],
  capsule: Capsule
): readonly RetrieveCFragsResult[] => {
  const reencrypted = verifiedKFrags
    .map((kFrag) => reencrypt(capsule, kFrag))
    .map((cFrag) => CapsuleFrag.fromBytes(cFrag.toBytes()));
  const cFrags = Object.fromEntries(zip(ursulas, reencrypted));
  return [{ cFrags, errors: {} }];
};

export const mockRetrieveCFragsRequest = (
  ursulas: readonly ChecksumAddress[],
  verifiedKFrags: readonly VerifiedKeyFrag[],
  capsule: Capsule
) => {
  const results = fakeCFragResponse(ursulas, verifiedKFrags, capsule);
  return jest
    .spyOn(PorterClient.prototype, 'retrieveCFrags')
    .mockImplementation(() => {
      return Promise.resolve(results);
    });
};
export const mockGenerateKFrags = (withValue?: {
  delegatingKey: PublicKey;
  verifiedKFrags: VerifiedKeyFrag[];
}) => {
  const spy = jest.spyOn(Alice.prototype as any, 'generateKFrags');
  if (withValue) {
    return spy.mockImplementation(() => withValue);
  }
  return spy;
};

export const mockEncryptTreasureMap = (withValue?: EncryptedTreasureMap) => {
  const spy = jest.spyOn(
    BlockchainPolicy.prototype as any,
    'encryptTreasureMap'
  );
  if (withValue) {
    return spy.mockImplementation(() => withValue);
  }
  return spy;
};

export const reencryptKFrags = (
  kFrags: readonly VerifiedKeyFrag[],
  capsule: Capsule
): {
  verifiedCFrags: VerifiedCapsuleFrag[];
} => {
  if (!kFrags) {
    throw new Error('Pass at least one kFrag.');
  }
  const verifiedCFrags = kFrags.map((kFrag) => reencrypt(capsule, kFrag));
  return { verifiedCFrags };
};

export const mockMakeTreasureMap = () => {
  return jest.spyOn(BlockchainPolicy.prototype as any, 'makeTreasureMap');
};

export const mockDetectEthereumProvider = () => {
  return jest.fn(async () => {
    return {} as unknown as providers.ExternalProvider;
  });
};

export const fakeDkgFlow = (
  variant: FerveoVariant,
  ritualId: number,
  sharesNum: number,
  threshold: number
) => {
  if (
    !variant.equals(FerveoVariant.simple) &&
    !variant.equals(FerveoVariant.precomputed)
  ) {
    throw new Error(`Invalid variant: ${variant}`);
  }
  const validatorKeypairs: Keypair[] = [];
  const validators: Validator[] = [];
  for (let i = 0; i < sharesNum; i++) {
    const keypair = Keypair.random();
    validatorKeypairs.push(keypair);
    const validator = new Validator(genEthAddr(i), keypair.publicKey);
    validators.push(validator);
  }

  // Each validator holds their own DKG instance and generates a transcript every
  // validator, including themselves
  const messages: ValidatorMessage[] = [];
  const transcripts: Transcript[] = [];
  validators.forEach((sender) => {
    const dkg = new Dkg(ritualId, sharesNum, threshold, validators, sender);
    const transcript = dkg.generateTranscript();
    transcripts.push(transcript);
    const message = new ValidatorMessage(sender, transcript);
    messages.push(message);
  });

  // Now that every validator holds a dkg instance and a transcript for every other validator,
  // every validator can aggregate the transcripts
  const dkg = new Dkg(
    ritualId,
    sharesNum,
    threshold,
    validators,
    validators[0]
  );

  // Let's say that we've only received `threshold` transcripts
  const receivedMessages = messages.slice(0, threshold);

  const serverAggregate = dkg.aggregateTranscript(receivedMessages);
  expect(serverAggregate.verify(sharesNum, receivedMessages)).toBeTruthy();

  // Client can also aggregate the transcripts and verify them
  const clientAggregate = new AggregatedTranscript(receivedMessages);
  expect(clientAggregate.verify(sharesNum, receivedMessages)).toBeTruthy();
  return {
    ritualId,
    sharesNum,
    threshold,
    validatorKeypairs,
    validators,
    transcripts,
    dkg,
    receivedMessages,
    serverAggregate,
  };
};

interface FakeDkgRitualFlow {
  validators: Validator[];
  validatorKeypairs: Keypair[];
  ritualId: number;
  sharesNum: number;
  threshold: number;
  receivedMessages: ValidatorMessage[];
  variant: FerveoVariant;
  ciphertext: Ciphertext;
  aad: Uint8Array;
  dkg: Dkg;
  message: Uint8Array;
}

export const fakeTDecFlow = ({
  validators,
  validatorKeypairs,
  ritualId,
  sharesNum,
  threshold,
  receivedMessages,
  variant,
  ciphertext,
  aad,
  message,
}: FakeDkgRitualFlow) => {
  // Having aggregated the transcripts, the validators can now create decryption shares
  const decryptionShares: (
    | DecryptionSharePrecomputed
    | DecryptionShareSimple
  )[] = [];
  zip(validators, validatorKeypairs).forEach(([validator, keypair]) => {
    const dkg = new Dkg(ritualId, sharesNum, threshold, validators, validator);
    const aggregate = dkg.aggregateTranscript(receivedMessages);
    const isValid = aggregate.verify(sharesNum, receivedMessages);
    if (!isValid) {
      throw new Error('Transcript is invalid');
    }

    let decryptionShare;
    if (variant.equals(FerveoVariant.precomputed)) {
      decryptionShare = aggregate.createDecryptionSharePrecomputed(
        dkg,
        ciphertext,
        aad,
        keypair
      );
    } else if (variant.equals(FerveoVariant.simple)) {
      decryptionShare = aggregate.createDecryptionShareSimple(
        dkg,
        ciphertext,
        aad,
        keypair
      );
    } else {
      throw new Error(`Invalid variant: ${variant}`);
    }
    decryptionShares.push(decryptionShare);
  });

  // Now, the decryption share can be used to decrypt the ciphertext
  // This part is in the client API

  let sharedSecret;
  if (variant.equals(FerveoVariant.precomputed)) {
    sharedSecret = combineDecryptionSharesPrecomputed(decryptionShares);
  } else if (variant.equals(FerveoVariant.simple)) {
    sharedSecret = combineDecryptionSharesSimple(decryptionShares);
  } else {
    throw new Error(`Invalid variant: ${variant}`);
  }

  // The client should have access to the public parameters of the DKG
  const plaintext = decryptWithSharedSecret(ciphertext, aad, sharedSecret);
  if (!bytesEqual(plaintext, message)) {
    throw new Error('Decryption failed');
  }
  return { decryptionShares, sharedSecret, plaintext };
};

export const fakeDkgTDecFlowE2e = (
  variant: FerveoVariant,
  message = toBytes('fake-message'),
  aad = toBytes('fake-aad'),
  ritualId = 0,
  sharesNum = 4,
  threshold = 4
) => {
  const ritual = fakeDkgFlow(variant, ritualId, sharesNum, threshold);

  // In the meantime, the client creates a ciphertext and decryption request
  const ciphertext = ferveoEncrypt(message, aad, ritual.dkg.publicKey());
  const { decryptionShares } = fakeTDecFlow({
    ...ritual,
    variant,
    ciphertext,
    aad,
    message,
  });

  return {
    ...ritual,
    message,
    aad,
    ciphertext,
    decryptionShares,
  };
};

export const fakeCoordinatorRitual = (
  ritualId: number
): {
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
} => {
  const ritual = fakeDkgTDecFlowE2e(FerveoVariant.precomputed);
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

export const fakeDkgParticipants = (
  ritualId: number,
  variant = FerveoVariant.precomputed
): {
  participants: DkgParticipant[];
  participantSecrets: Record<string, SessionStaticSecret>;
} => {
  const ritual = fakeDkgTDecFlowE2e(variant);
  const label = toBytes(`${ritualId}`);

  const participantSecrets: Record<string, SessionStaticSecret> =
    Object.fromEntries(
      ritual.validators.map(({ address }) => {
        const participantSecret = SessionSecretFactory.random().makeKey(label);
        return [address.toString(), participantSecret];
      })
    );

  const participants: DkgParticipant[] = zip(
    Object.entries(participantSecrets),
    ritual.transcripts
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

export const mockGetParticipants = (participants: DkgParticipant[]) => {
  return jest
    .spyOn(DkgCoordinatorAgent, 'getParticipants')
    .mockImplementation(() => {
      return Promise.resolve(participants);
    });
};

export const mockCbdDecrypt = (
  ritualId: number,
  decryptionShares: (DecryptionSharePrecomputed | DecryptionShareSimple)[],
  participantSecrets: Record<string, SessionStaticSecret>,
  requesterPk: SessionStaticKey,
  errors: Record<string, string> = {}
) => {
  const encryptedResponses: Record<
    string,
    EncryptedThresholdDecryptionResponse
  > = Object.fromEntries(
    zip(decryptionShares, Object.entries(participantSecrets)).map(
      ([share, [address, secret]]) => {
        const resp = new ThresholdDecryptionResponse(ritualId, share.toBytes());
        const sessionSecret = secret.deriveSharedSecret(requesterPk);
        const encryptedResp = resp.encrypt(sessionSecret);
        return [address, encryptedResp];
      }
    )
  );

  const result: CbdDecryptResult = {
    encryptedResponses,
    errors,
  };
  return jest
    .spyOn(PorterClient.prototype, 'cbdDecrypt')
    .mockImplementation(() => {
      return Promise.resolve(result);
    });
};

export const mockRandomSessionStaticSecret = (secret: SessionStaticSecret) => {
  return jest
    .spyOn(ThresholdDecrypter.prototype as any, 'makeSessionKey')
    .mockImplementation(() => secret);
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
    {
      sharesNum: ritual.sharesNum,
      threshold: ritual.threshold,
    },
    DkgRitualState.FINALIZED
  );
};

export const mockInitializeRitual = (ritualId: number) => {
  return jest.spyOn(DkgClient, 'initializeRitual').mockImplementation(() => {
    return Promise.resolve(ritualId);
  });
};

export const mockGetExistingRitual = (dkgRitual: DkgRitual) => {
  return jest.spyOn(DkgClient, 'getExistingRitual').mockImplementation(() => {
    return Promise.resolve(dkgRitual);
  });
};

export const makeCohort = async (ursulas: Ursula[]) => {
  const getUrsulasSpy = mockGetUrsulas(ursulas);
  const porterUri = 'https://_this.should.crash';
  const numUrsulas = ursulas.length;
  const cohort = await Cohort.create(porterUri, numUrsulas);
  expect(getUrsulasSpy).toHaveBeenCalled();
  return cohort;
};

export const mockGetRitualState = (state = DkgRitualState.FINALIZED) => {
  return jest
    .spyOn(DkgCoordinatorAgent, 'getRitualState')
    .mockImplementation((_provider, _ritualId) => Promise.resolve(state));
};

export const mockVerifyRitual = (isValid = true) => {
  return jest
    .spyOn(DkgClient, 'verifyRitual')
    .mockImplementation((_provider, _ritualId) => Promise.resolve(isValid));
};

export const mockGetParticipantPublicKey = (pk = fakeFerveoPublicKey()) => {
  return jest
    .spyOn(DkgClient, 'getParticipantPublicKey')
    .mockImplementation((_address) => pk);
};

export const fakeFerveoPublicKey = (): FerveoPublicKey => {
  return Keypair.random().publicKey;
};
