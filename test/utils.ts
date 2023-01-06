// Disabling some of the eslint rules for conveninence.
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Block } from '@ethersproject/providers';
import {
  Capsule,
  CapsuleFrag,
  EncryptedTreasureMap,
  reencrypt,
  SecretKey,
  VerifiedCapsuleFrag,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import axios from 'axios';
import { ethers, Wallet } from 'ethers';

import { Alice, Bob, Configuration, RemoteBob } from '../src';
import {
  GetUrsulasResponse,
  Porter,
  RetrieveCFragsResponse,
  Ursula,
} from '../src/characters/porter';
import { BlockchainPolicy, PreEnactedPolicy } from '../src/policies/policy';
import { ChecksumAddress } from '../src/types';
import { toBytes, toHexString, zip } from '../src/utils';

export const fromBytes = (bytes: Uint8Array): string =>
  new TextDecoder().decode(bytes);

export const bytesEqual = (first: Uint8Array, second: Uint8Array): boolean =>
  first.length === second.length &&
  first.every((value, index) => value === second[index]);

const mockConfig: Configuration = {
  porterUri: 'https://_this_should_crash.com/',
};

export const mockBob = (): Bob => {
  const secretKey = SecretKey.fromBytes(
    toBytes('fake-secret-key-32-bytes-bob-xxx')
  );
  return Bob.fromSecretKey(mockConfig, secretKey);
};

export const mockRemoteBob = (): RemoteBob => {
  const { decryptingKey, verifyingKey } = mockBob();
  return RemoteBob.fromKeys(decryptingKey, verifyingKey);
};

export const mockAlice = (aliceKey = 'fake-secret-key-32-bytes-alice-x') => {
  const secretKey = SecretKey.fromBytes(toBytes(aliceKey));
  const provider = mockWeb3Provider(secretKey.toSecretBytes());
  return Alice.fromSecretKey(mockConfig, secretKey, provider);
};

export const mockWeb3Provider = (
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
    request: () => '',
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
  // { random garbage } // ! this is a random garbage!
  // { random garbage }  as unknown // ! well, this is unknow type, and not web3provider
  // { random garbage }  as Web3Provider // ! well, the defi
  // random_type is part of all_types => all_types includes web3provider
  // ({ random garbage }  as unknown) as ethers.providers.Web3Provider // ! now it is web3provider
};

export const mockUrsulas = (): readonly Ursula[] => {
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
  const mockPorterUrsulas = (
    mockUrsulas: readonly Ursula[]
  ): GetUrsulasResponse => {
    return {
      result: {
        ursulas: mockUrsulas.map(({ encryptingKey, uri, checksumAddress }) => ({
          encrypting_key: toHexString(encryptingKey.toBytes()),
          uri: uri,
          checksum_address: checksumAddress,
        })),
      },
      version: '5.2.0',
    };
  };

  return jest.spyOn(axios, 'get').mockImplementation(async () => {
    return Promise.resolve({ data: mockPorterUrsulas(ursulas) });
  });
};
export const mockPublishToBlockchain = () => {
  const txHash = '0x1234567890123456789012345678901234567890';
  return jest
    .spyOn(PreEnactedPolicy.prototype as any, 'publish')
    .mockImplementation(async () => Promise.resolve(txHash));
};

export const mockCFragResponse = (
  ursulas: readonly ChecksumAddress[],
  verifiedKFrags: readonly VerifiedKeyFrag[],
  capsule: Capsule
): readonly RetrieveCFragsResponse[] => {
  if (ursulas.length !== verifiedKFrags.length) {
    throw new Error(
      'Number of verifiedKFrags must match the number of Ursulas'
    );
  }
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
  const results = mockCFragResponse(ursulas, verifiedKFrags, capsule);
  return jest
    .spyOn(Porter.prototype, 'retrieveCFrags')
    .mockImplementation(() => {
      return Promise.resolve(results);
    });
};

export const mockRetrieveCFragsRequestThrows = () => {
  return jest
    .spyOn(Porter.prototype, 'retrieveCFrags')
    .mockRejectedValue(new Error('fake-reencryption-request-failed-error'));
};

export const mockGenerateKFrags = () => {
  return jest.spyOn(Alice.prototype as any, 'generateKFrags');
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
