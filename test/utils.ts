// Disabling some of the eslint rules for conveninence.
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Block } from '@ethersproject/providers';
import {
  Capsule,
  CapsuleFrag,
  EncryptedTreasureMap,
  PublicKey,
  reencrypt,
  SecretKey,
  VerifiedCapsuleFrag,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import axios from 'axios';
import { ethers, providers, Wallet } from 'ethers';
import { keccak256 } from 'ethers/lib/utils';
import {
  AggregatedTranscript,
  combineDecryptionSharesPrecomputed,
  combineDecryptionSharesSimple,
  DecryptionSharePrecomputed,
  DecryptionShareSimple,
  decryptWithSharedSecret,
  Dkg,
  encrypt,
  EthereumAddress,
  Keypair,
  Transcript,
  Validator,
  ValidatorMessage,
} from 'ferveo-wasm';

import { Alice, Bob, Cohort, Configuration, RemoteBob } from '../src';
import { DkgParticipant, DkgRitual } from '../src/agents/coordinator';
import {
  GetUrsulasResponse,
  Porter,
  RetrieveCFragsResponse,
  Ursula,
} from '../src/characters/porter';
import { BlockchainPolicy, PreEnactedPolicy } from '../src/policies/policy';
import { ChecksumAddress } from '../src/types';
import { toBytes, toHexString, zip } from '../src/utils';

export const bytesEqual = (first: Uint8Array, second: Uint8Array): boolean =>
  first.length === second.length &&
  first.every((value, index) => value === second[index]);

export const fromBytes = (bytes: Uint8Array): string =>
  new TextDecoder().decode(bytes);

const mockConfig: Configuration = {
  porterUri: 'https://_this_should_crash.com/',
};

export const fakeBob = (): Bob => {
  const secretKey = SecretKey.fromBEBytes(
    toBytes('fake-secret-key-32-bytes-bob-xxx')
  );
  return Bob.fromSecretKey(mockConfig, secretKey);
};

export const fakeRemoteBob = (): RemoteBob => {
  const { decryptingKey, verifyingKey } = fakeBob();
  return RemoteBob.fromKeys(decryptingKey, verifyingKey);
};

export const fakeAlice = (aliceKey = 'fake-secret-key-32-bytes-alice-x') => {
  const secretKey = SecretKey.fromBEBytes(toBytes(aliceKey));
  const provider = fakeWeb3Provider(secretKey.toBEBytes());
  return Alice.fromSecretKey(mockConfig, secretKey, provider);
};

export const fakeWeb3Provider = (
  secretKeyBytes: Uint8Array,
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

export const fakeUrsulas = (): readonly Ursula[] => {
  return [
    {
      encryptingKey: SecretKey.random().publicKey(),
      checksumAddress: '0x5cF1703A1c99A4b42Eb056535840e93118177232',
      uri: 'https://example.a.com:9151',
    },
    {
      encryptingKey: SecretKey.random().publicKey(),
      checksumAddress: '0x7fff551249D223f723557a96a0e1a469C79cC934',
      uri: 'https://example.b.com:9151',
    },
    {
      encryptingKey: SecretKey.random().publicKey(),
      checksumAddress: '0x9C7C824239D3159327024459Ad69bB215859Bd25',
      uri: 'https://example.c.com:9151',
    },
    {
      encryptingKey: SecretKey.random().publicKey(),
      checksumAddress: '0x9919C9f5CbBAA42CB3bEA153E14E16F85fEA5b5D',
      uri: 'https://example.d.com:9151',
    },
    {
      encryptingKey: SecretKey.random().publicKey(),
      checksumAddress: '0xfBeb3368735B3F0A65d1F1E02bf1d188bb5F5BE6',
      uri: 'https://example.e.com:9151',
    },
  ].map(({ encryptingKey, checksumAddress, uri }) => {
    return {
      checksumAddress: checksumAddress.toLowerCase(),
      encryptingKey,
      uri,
    };
  });
};

export const mockGetUrsulas = (ursulas: readonly Ursula[]) => {
  const fakePorterUrsulas = (
    mockUrsulas: readonly Ursula[]
  ): GetUrsulasResponse => {
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
): readonly RetrieveCFragsResponse[] => {
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
    .spyOn(Porter.prototype, 'retrieveCFrags')
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

const fakeDkgRitualE2e = (variant: 'precomputed' | 'simple') => {
  if (variant !== 'precomputed' && variant !== 'simple') {
    throw new Error(`Invalid variant: ${variant}`);
  }

  const genEthAddr = (i: number) => {
    const ethAddr =
      '0x' + '0'.repeat(40 - i.toString(16).length) + i.toString(16);
    return EthereumAddress.fromString(ethAddr);
  };

  const tau = 1;
  const sharesNum = 4;
  const threshold = Math.floor((sharesNum * 2) / 3);

  const validator_keypairs: Keypair[] = [];
  const validators: Validator[] = [];
  for (let i = 0; i < sharesNum; i++) {
    const keypair = Keypair.random();
    validator_keypairs.push(keypair);
    const validator = new Validator(genEthAddr(i), keypair.publicKey);
    validators.push(validator);
  }

  // Each validator holds their own DKG instance and generates a transcript every
  // validator, including themselves
  const messages: ValidatorMessage[] = [];
  const transcripts: Transcript[] = [];
  validators.forEach((sender) => {
    const dkg = new Dkg(tau, sharesNum, threshold, validators, sender);
    const transcript = dkg.generateTranscript();
    transcripts.push(transcript);
    const message = new ValidatorMessage(sender, transcript);
    messages.push(message);
  });

  // Now that every validator holds a dkg instance and a transcript for every other validator,
  // every validator can aggregate the transcripts
  const dkg = new Dkg(tau, sharesNum, threshold, validators, validators[0]);

  // Let's say that we've only received `threshold` transcripts
  const receivedMessages = messages.slice(0, threshold);

  const serverAggregate = dkg.aggregateTranscript(receivedMessages);
  expect(serverAggregate.verify(sharesNum, receivedMessages)).toBeTruthy();

  // Client can also aggregate the transcripts and verify them
  const clientAggregate = new AggregatedTranscript(receivedMessages);
  expect(clientAggregate.verify(sharesNum, receivedMessages)).toBeTruthy();

  // In the meantime, the client creates a ciphertext and decryption request
  const msg = Buffer.from('my-msg');
  const aad = Buffer.from('my-aad');
  const ciphertext = encrypt(msg, aad, dkg.finalKey());

  // Having aggregated the transcripts, the validators can now create decryption shares
  const decryptionShares: (
    | DecryptionSharePrecomputed
    | DecryptionShareSimple
  )[] = [];
  zip(validators, validator_keypairs).forEach(([validator, keypair]) => {
    const dkg = new Dkg(tau, sharesNum, threshold, validators, validator);
    const aggregate = dkg.aggregateTranscript(receivedMessages);
    const isValid = aggregate.verify(sharesNum, receivedMessages);
    if (!isValid) {
      throw new Error('Transcript is invalid');
    }

    let decryptionShare;

    if (variant === 'precomputed') {
      decryptionShare = aggregate.createDecryptionSharePrecomputed(
        dkg,
        ciphertext,
        aad,
        keypair
      );
    } else {
      decryptionShare = aggregate.createDecryptionShareSimple(
        dkg,
        ciphertext,
        aad,
        keypair
      );
    }
    decryptionShares.push(decryptionShare);
  });

  // Now, the decryption share can be used to decrypt the ciphertext
  // This part is in the client API

  let sharedSecret;
  if (variant === 'precomputed') {
    sharedSecret = combineDecryptionSharesPrecomputed(decryptionShares);
  } else {
    sharedSecret = combineDecryptionSharesSimple(
      decryptionShares,
      dkg.publicParams()
    );
  }

  // The client should have access to the public parameters of the DKG
  const plaintext = decryptWithSharedSecret(
    ciphertext,
    aad,
    sharedSecret,
    dkg.publicParams()
  );
  if (!bytesEqual(plaintext, msg)) {
    throw new Error('Decryption failed');
  }

  return {
    tau,
    sharesNum,
    threshold,
    validator_keypairs,
    validators,
    transcripts,
    dkg,
    receivedMessages,
    msg,
    aad,
    ciphertext,
    serverAggregate,
  };
};

export const fakeDkgRitual = (ritualId: number): DkgRitual => {
  const ritual = fakeDkgRitualE2e('precomputed');
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
    publicKey: toHexString(ritual.dkg.finalKey().toBytes()),
    publicKeyHash: keccak256(ritual.dkg.finalKey().toBytes()),
  };
};

export const fakeDkgParticipants = (): DkgParticipant[] => {
  const ritual = fakeDkgRitualE2e('precomputed');
  return zip(
    zip(ritual.validators, ritual.transcripts),
    ritual.validator_keypairs
  ).map(([[v, t], k]) => {
    return {
      node: v.address.toString(),
      aggregated: true, // Assuming all validators already contributed to the aggregate
      transcript: toHexString(t.toBytes()),
      publicKey: toHexString(k.publicKey.toBytes()),
    };
  });
};

export const makeCohort = async (ursulas: Ursula[]) => {
  const getUrsulasSpy = mockGetUrsulas(ursulas);
  const config = {
    threshold: 2,
    shares: 3,
    porterUri: 'https://_this.should.crash',
  };
  const cohort = await Cohort.create(config);
  expect(getUrsulasSpy).toHaveBeenCalled();
  return cohort;
};
