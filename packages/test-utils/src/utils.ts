// Disabling some of the eslint rules for convenience.
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  AggregatedTranscript,
  Capsule,
  CapsuleFrag,
  combineDecryptionSharesSimple,
  DecryptionSharePrecomputed,
  DecryptionShareSimple,
  Dkg,
  DkgPublicKey,
  EncryptedThresholdDecryptionResponse,
  EthereumAddress,
  FerveoVariant,
  Keypair,
  MessageKit,
  reencrypt,
  SecretKey,
  SessionStaticKey,
  SessionStaticSecret,
  ThresholdDecryptionResponse,
  ThresholdMessageKit,
  Transcript,
  Validator,
  ValidatorMessage,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import {
  ChecksumAddress,
  DkgCoordinatorAgent,
  PorterClient,
  RetrieveCFragsResult,
  TacoDecryptResult,
  Ursula,
  zip,
} from '@nucypher/shared';
import {
  EIP4361AuthProvider,
  SingleSignOnEIP4361AuthProvider,
  USER_ADDRESS_PARAM_DEFAULT,
} from '@nucypher/taco-auth';
import { ethers, providers, Wallet } from 'ethers';
import { expect, SpyInstance, vi } from 'vitest';

import { TEST_SIWE_PARAMS } from './variables';

export const bytesEqual = (first: Uint8Array, second: Uint8Array): boolean =>
  first.length === second.length &&
  first.every((value, index) => value === second[index]);

export const fromBytes = (bytes: Uint8Array): string =>
  new TextDecoder().decode(bytes);

export const fakePorterUri = 'https://_this_should_crash.com/';

const makeFakeProvider = (
  timestamp: number,
  blockNumber: number,
  blockHash: string,
) => {
  const block = { timestamp, hash: blockHash };
  return {
    getBlockNumber: () => Promise.resolve(blockNumber),
    getBlock: () => Promise.resolve(block),
    _isProvider: true,
    getNetwork: () => Promise.resolve({ name: 'mockNetwork', chainId: 1234 }),
  };
};

export const fakeSigner = (
  secretKeyBytes = SecretKey.random().toBEBytes(),
  blockNumber = 1000,
  blockTimestamp = 1000,
  blockHash = '0x0000000000000000000000000000000000000000',
) => {
  const provider = makeFakeProvider(blockNumber, blockTimestamp, blockHash);
  return {
    ...new Wallet(secretKeyBytes),
    provider: provider,
    _signTypedData: () => Promise.resolve('fake-typed-signature'),
    signMessage: () => Promise.resolve('fake-signature'),
    getAddress: () =>
      Promise.resolve('0x0000000000000000000000000000000000000000'),
  } as unknown as ethers.providers.JsonRpcSigner;
};

export const fakeAuthProviders = async () => {
  return {
    [USER_ADDRESS_PARAM_DEFAULT]: fakeEIP4351AuthProvider(),
    [':userAddressExternalEIP4361']:
      await fakeSingleSignOnEIP4361AuthProvider(),
  };
};

export const fakeProvider = (
  secretKeyBytes = SecretKey.random().toBEBytes(),
  blockNumber = 1000,
  blockTimestamp = 1000,
  blockHash = '0x0000000000000000000000000000000000000000',
): ethers.providers.Web3Provider => {
  const fakeProvider = makeFakeProvider(blockTimestamp, blockNumber, blockHash);
  const fakeSignerWithProvider = fakeSigner(
    secretKeyBytes,
    blockNumber,
    blockTimestamp,
  );
  return {
    ...fakeProvider,
    getSigner: () => fakeSignerWithProvider,
  } as unknown as ethers.providers.Web3Provider;
};

const fakeEIP4351AuthProvider = () => {
  return new EIP4361AuthProvider(
    fakeProvider(),
    fakeSigner(),
    TEST_SIWE_PARAMS,
  );
};

const fakeSingleSignOnEIP4361AuthProvider = async () => {
  const message =
    'localhost wants you to sign in with your Ethereum account:\n0x924c255297BF9032583dF6E06a8633dc720aB52D\n\nSign-In With Ethereum Example Statement\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1234\nNonce: bTyXgcQxn2htgkjJn\nIssued At: 2024-07-18T16:53:39.093516Z';
  const signature =
    '0x22cc163b9c37cf425997b76ebafd44a0d68043d0dc9a1dbf823e78c320924476644f28abcf0974d54b8604eff8a62a51559994537d4b8a85cdee977e02ee98921b';

  return SingleSignOnEIP4361AuthProvider.fromExistingSiweInfo(
    message,
    signature,
  );
};

const genChecksumAddress = (i: number): ChecksumAddress =>
  `0x${'0'.repeat(40 - i.toString(16).length)}${i.toString(
    16,
  )}`.toLowerCase() as ChecksumAddress;

const genEthAddr = (i: number) =>
  EthereumAddress.fromString(genChecksumAddress(i));

export const fakeUrsulas = (n = 4): Ursula[] =>
  // 0...n-1
  Array.from(Array(n).keys()).map((i: number) => ({
    encryptingKey: SecretKey.random().publicKey(),
    checksumAddress: genChecksumAddress(i),
    uri: `https://example.${i}.com:9151`,
  }));

export const mockGetUrsulas = (
  ursulas: Ursula[] = fakeUrsulas(),
): SpyInstance => {
  return vi.spyOn(PorterClient.prototype, 'getUrsulas').mockImplementation(async () => {
    return Promise.resolve(ursulas);
  });
};

const fakeCFragResponse = (
  ursulas: readonly ChecksumAddress[],
  verifiedKFrags: readonly VerifiedKeyFrag[],
  capsule: Capsule,
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
  capsule: Capsule,
): SpyInstance => {
  const results = fakeCFragResponse(ursulas, verifiedKFrags, capsule);
  return vi
    .spyOn(PorterClient.prototype, 'retrieveCFrags')
    .mockImplementation(() => {
      return Promise.resolve(results);
    });
};

export const mockDetectEthereumProvider =
  (): (() => providers.ExternalProvider) => {
    return () => ({}) as unknown as providers.ExternalProvider;
  };

export const fakeDkgFlow = (
  variant: FerveoVariant,
  ritualId: number,
  sharesNum: number,
  threshold: number,
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
    validators[0],
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
  dkg: Dkg;
  message: Uint8Array;
  dkgPublicKey: DkgPublicKey;
  thresholdMessageKit: ThresholdMessageKit;
}

export const fakeTDecFlow = ({
  validators,
  validatorKeypairs,
  ritualId,
  sharesNum,
  threshold,
  receivedMessages,
  message,
  thresholdMessageKit,
}: FakeDkgRitualFlow) => {
  // Having aggregated the transcripts, the validators can now create decryption shares
  const decryptionShares: DecryptionShareSimple[] = [];
  zip(validators, validatorKeypairs).forEach(([validator, keypair]) => {
    const dkg = new Dkg(ritualId, sharesNum, threshold, validators, validator);
    const aggregate = dkg.aggregateTranscript(receivedMessages);
    const isValid = aggregate.verify(sharesNum, receivedMessages);
    if (!isValid) {
      throw new Error('Transcript is invalid');
    }

    const decryptionShare = aggregate.createDecryptionShareSimple(
      dkg,
      thresholdMessageKit.ciphertextHeader,
      thresholdMessageKit.acp.aad(),
      keypair,
    );
    decryptionShares.push(decryptionShare);
  });

  const sharedSecret = combineDecryptionSharesSimple(decryptionShares);

  const plaintext = thresholdMessageKit.decryptWithSharedSecret(sharedSecret);
  if (!bytesEqual(plaintext, message)) {
    throw new Error('Decryption failed');
  }
  return {
    decryptionShares,
    plaintext,
    sharedSecret,
    thresholdMessageKit,
  };
};

export const mockTacoDecrypt = (
  ritualId: number,
  decryptionShares: (DecryptionSharePrecomputed | DecryptionShareSimple)[],
  participantSecrets: Record<string, SessionStaticSecret>,
  requesterPk: SessionStaticKey,
  errors: Record<string, string> = {},
): SpyInstance => {
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
      },
    ),
  );

  const result: TacoDecryptResult = {
    encryptedResponses,
    errors,
  };
  return vi
    .spyOn(PorterClient.prototype, 'tacoDecrypt')
    .mockImplementation(() => {
      return Promise.resolve(result);
    });
};

export const mockGetRitualIdFromPublicKey = (ritualId: number): SpyInstance => {
  return vi
    .spyOn(DkgCoordinatorAgent, 'getRitualIdFromPublicKey')
    .mockImplementation(() => {
      return Promise.resolve(ritualId);
    });
};

export const mockRetrieveAndDecrypt = (
  makeTreasureMapSpy: SpyInstance,
  encryptedMessageKit: MessageKit,
) => {
  // Setup mocks for `retrieveAndDecrypt`
  const ursulaAddresses = (
    makeTreasureMapSpy.mock.calls[0][0] as readonly Ursula[]
  ).map((u) => u.checksumAddress);
  const verifiedKFrags = makeTreasureMapSpy.mock
    .calls[0][1] as readonly VerifiedKeyFrag[];
  return mockRetrieveCFragsRequest(
    ursulaAddresses,
    verifiedKFrags,
    encryptedMessageKit.capsule,
  );
};
