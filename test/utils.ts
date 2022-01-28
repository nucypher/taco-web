import { Block } from '@ethersproject/providers';
import {
  Capsule,
  CapsuleFrag,
  CapsuleWithFrags,
  HRAC,
  reencrypt,
  SecretKey,
  TreasureMapBuilder,
  VerifiedCapsuleFrag,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import axios from 'axios';
import { ContractTransaction, ethers, Wallet } from 'ethers';

import { Alice, Bob, RemoteBob } from '../src';
import { PolicyManagerAgent } from '../src/agents/policy-manager';
import { StakingEscrowAgent } from '../src/agents/staking-escrow';
import {
  GetUrsulasResponse,
  Porter,
  RetrieveCFragsResponse,
  Ursula,
} from '../src/characters/porter';
import { BlockchainPolicy, PreEnactedPolicy } from '../src/policies/policy';
import { ChecksumAddress, Configuration } from '../src/types';
import { toBytes, toHexString, zip } from '../src/utils';

const mockConfig: Configuration = {
  porterUri: 'https://_this_should_crash.com/',
};

export const mockBob = (): Bob => {
  const bobKey = toBytes('fake-secret-key-32-bytes-bob-xxx');
  return Bob.fromSecretKey(mockConfig, bobKey);
};

export const mockRemoteBob = (): RemoteBob => {
  const { decryptingKey, verifyingKey } = mockBob();
  return RemoteBob.fromKeys(decryptingKey, verifyingKey);
};

export const mockAlice = (aliceKey?: string) => {
  const keyBytes = aliceKey
    ? toBytes(aliceKey)
    : toBytes('fake-secret-key-32-bytes-alice-x');
  const provider = mockWeb3Provider(keyBytes);
  return Alice.fromSecretKeyBytes(
    mockConfig,
    keyBytes,
    provider as ethers.providers.Web3Provider
  );
};

export const mockWeb3Provider = (
  secretKeyBytes: Uint8Array,
  blockNumber?: number,
  blockTimestamp?: number
): Partial<ethers.providers.Web3Provider> => {
  const block = { timestamp: blockTimestamp ?? 1000 };
  const provider = {
    getBlockNumber: () => Promise.resolve(blockNumber ?? 1000),
    getBlock: () => Promise.resolve(block as Block),
    _isProvider: true,
    getNetwork: () => Promise.resolve({ name: 'mock', chainId: -1 }),
  };
  const fakeSignerWithProvider = {
    ...new Wallet(secretKeyBytes),
    provider,
  };
  return {
    ...provider,
    getSigner: () =>
      fakeSignerWithProvider as unknown as ethers.providers.JsonRpcSigner,
  };
};

export const mockUrsulas = (): Ursula[] => {
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

export const mockGetUrsulas = (ursulas: Ursula[]) => {
  const mockPorterUrsulas = (mockUrsulas: Ursula[]): GetUrsulasResponse => {
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

export const mockPolicyManagerRevokePolicy = () => {
  return jest
    .spyOn(PolicyManagerAgent, 'revokePolicy')
    .mockImplementationOnce(async () => {
      return Promise.resolve(undefined as unknown as ContractTransaction);
    });
};

export const mockPolicyManagerPolicyExists = (policyDisabled: boolean) => {
  return jest
    .spyOn(PolicyManagerAgent, 'isPolicyDisabled')
    .mockImplementationOnce(async () => {
      return Promise.resolve(policyDisabled);
    });
};

export const mockGetGlobalMinRate = () => {
  return jest
    .spyOn(PolicyManagerAgent, 'getGlobalMinRate')
    .mockImplementationOnce(async () => {
      return Promise.resolve(50000000000);
    });
};

export const mockPublishToBlockchain = () => {
  const txHash = '0x1234567890123456789012345678901234567890';
  return jest
    .spyOn(PreEnactedPolicy.prototype as any, 'publish')
    .mockImplementation(async () => Promise.resolve(txHash));
};

export const mockCFragResponse = (
  ursulas: ChecksumAddress[],
  verifiedKFrags: VerifiedKeyFrag[],
  capsule: Capsule
): RetrieveCFragsResponse[] => {
  if (ursulas.length !== verifiedKFrags.length) {
    throw new Error(
      'Number of verifiedKFrags must match the number of Ursulas'
    );
  }
  const reencrypted = verifiedKFrags
    .map((kFrag) => reencrypt(capsule, kFrag))
    .map((cFrag) => CapsuleFrag.fromBytes(cFrag.toBytes()));
  const result = Object.fromEntries(zip(ursulas, reencrypted));
  // We return one result per capsule, so just one result
  return [result];
};

export const mockRetrieveCFragsRequest = (
  ursulas: ChecksumAddress[],
  verifiedKFrags: VerifiedKeyFrag[],
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

export const mockEncryptTreasureMap = () => {
  return jest.spyOn(BlockchainPolicy.prototype as any, 'encryptTreasureMap');
};

export const reencryptKFrags = (
  kFrags: VerifiedKeyFrag[],
  capsule: Capsule
): {
  capsuleWithFrags: CapsuleWithFrags;
  verifiedCFrags: VerifiedCapsuleFrag[];
} => {
  if (!kFrags) {
    throw new Error('Pass at least one kFrag.');
  }
  let capsuleWithFrags: CapsuleWithFrags;
  const verifiedCFrags = kFrags.map((kFrag) => {
    const cFrag = reencrypt(capsule, kFrag);
    capsuleWithFrags = capsuleWithFrags
      ? capsuleWithFrags.withCFrag(cFrag)
      : capsule.withCFrag(cFrag);
    return cFrag;
  });
  return { capsuleWithFrags: capsuleWithFrags!, verifiedCFrags };
};

export const mockStakingEscrow = (
  currentPeriod = 100,
  secondsPerPeriod = 60
) => {
  const getCurrentPeriodSpy = jest
    .spyOn(StakingEscrowAgent, 'getCurrentPeriod')
    .mockImplementation(async () => Promise.resolve(currentPeriod));
  const getSecondsPerPeriodSpy = jest
    .spyOn(StakingEscrowAgent, 'getSecondsPerPeriod')
    .mockImplementation(async () => Promise.resolve(secondsPerPeriod));
  return { getCurrentPeriodSpy, getSecondsPerPeriodSpy };
};

export const mockTreasureMap = async () => {
  const alice = mockAlice();
  const bob = mockBob();
  const label = 'fake-label';
  const threshold = 2;
  const shares = 3;
  const { verifiedKFrags, delegatingKey } = await (alice as any).generateKFrags(
    bob,
    label,
    threshold,
    shares
  );
  const hrac = new HRAC(alice.verifyingKey, bob.verifyingKey, toBytes(label));
  const ursulas = mockUrsulas().slice(0, shares);
  const builder = new TreasureMapBuilder(
    alice.signer,
    hrac,
    delegatingKey,
    threshold
  );
  zip(ursulas, verifiedKFrags).forEach(([ursula, kFrag]) => {
    builder.addKfrag(
      toBytes(ursula.checksumAddress),
      ursula.encryptingKey,
      kFrag
    );
  });
  return builder.build();
};

export const mockMakeTresureMap = () => {
  return jest.spyOn(BlockchainPolicy.prototype as any, 'makeTreasureMap');
};
