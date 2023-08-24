import { SecretKey, VerifiedKeyFrag } from '@nucypher/nucypher-core';

import {
  conditions,
  DeployedPreStrategy,
  PreDecrypter,
  PreStrategy,
} from '../../src';
import { Ursula } from '../../src/porter';
import { toBytes } from '../../src/utils';
import {
  fakeUrsulas,
  makeCohort,
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockGetUrsulas,
  mockMakeTreasureMap,
  mockPublishToBlockchain,
  mockRetrieveCFragsRequest,
  testWalletClient,
} from '../utils';

import { aliceSecretKeyBytes, bobSecretKeyBytes } from './testVariables';

const {
  predefined: { ERC721Ownership },
  ConditionExpression,
} = conditions;

// Shared test variables
const aliceSecretKey = SecretKey.fromBEBytes(aliceSecretKeyBytes);
const bobSecretKey = SecretKey.fromBEBytes(bobSecretKeyBytes);
const ownsNFT = new ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: 5,
});
const conditionExpr = new ConditionExpression(ownsNFT);
const mockedUrsulas = fakeUrsulas();

const makePreStrategy = async () => {
  const cohort = await makeCohort(mockedUrsulas);
  const strategy = PreStrategy.create(cohort, aliceSecretKey, bobSecretKey);
  expect(strategy.cohort).toEqual(cohort);
  return strategy;
};

const makeDeployedPreStrategy = async () => {
  const strategy = await makePreStrategy();
  const generateKFragsSpy = mockGenerateKFrags();
  const publishToBlockchainSpy = mockPublishToBlockchain();
  const makeTreasureMapSpy = mockMakeTreasureMap();
  const encryptTreasureMapSpy = mockEncryptTreasureMap();

  const deployedStrategy = await strategy.deploy(testWalletClient, 'test');

  expect(generateKFragsSpy).toHaveBeenCalled();
  expect(publishToBlockchainSpy).toHaveBeenCalled();
  expect(makeTreasureMapSpy).toHaveBeenCalled();
  expect(encryptTreasureMapSpy).toHaveBeenCalled();

  expect(deployedStrategy.cohort).toEqual(strategy.cohort);

  const ursulaAddresses = (
    makeTreasureMapSpy.mock.calls[0][0] as readonly Ursula[]
  ).map((u) => u.checksumAddress);
  const verifiedKFrags = makeTreasureMapSpy.mock
    .calls[0][1] as readonly VerifiedKeyFrag[];

  return { deployedStrategy, ursulaAddresses, verifiedKFrags };
};
jest.mock('viem/actions', () => ({
  ...jest.requireActual('viem/actions'),
  getBlock: jest.fn().mockResolvedValue({
    timestamp: 1000,
  }),
  getBlockNumber: jest.fn().mockResolvedValue(BigInt(1000)),
  requestAddresses: jest
    .fn()
    .mockResolvedValue(['0x1234567890123456789012345678901234567890']),
  signTypedData: jest
    .fn()
    .mockResolvedValue('0x1234567890123456789012345678901234567890'),
}));

describe('PreStrategy', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a strategy', async () => {
    await makePreStrategy();
  });

  it('deploys a strategy', async () => {
    await makeDeployedPreStrategy();
  });

  describe('serialization', () => {
    it('serializes to plain object', async () => {
      const strategy = await makePreStrategy();
      const asObject = strategy.toObj();
      const fromObject = PreStrategy.fromObj(asObject);
      expect(fromObject.equals(strategy)).toBeTruthy();
    });

    it('serializes to JSON', async () => {
      const strategy = await makePreStrategy();
      const asJson = strategy.toJSON();
      const fromJSON = PreStrategy.fromJSON(asJson);
      expect(fromJSON.equals(strategy)).toBeTruthy();
    });
  });
});

describe('PreDeployedStrategy', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('encrypts and decrypts', async () => {
    const { deployedStrategy, ursulaAddresses, verifiedKFrags } =
      await makeDeployedPreStrategy();

    const plaintext = 'this is a secret';
    const encryptedMessageKit = deployedStrategy
      .makeEncrypter(conditionExpr)
      .encryptMessagePre(plaintext);

    // Setup mocks for `retrieveAndDecrypt`
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const retrieveCFragsSpy = mockRetrieveCFragsRequest(
      ursulaAddresses,
      verifiedKFrags,
      encryptedMessageKit.capsule
    );

    const decryptedMessage =
      await deployedStrategy.decrypter.retrieveAndDecrypt(
        [encryptedMessageKit],
        testWalletClient
      );
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(retrieveCFragsSpy).toHaveBeenCalled();
    expect(decryptedMessage[0]).toEqual(toBytes(plaintext));
  });

  describe('serialization', () => {
    it('serializes to a plain object', async () => {
      const { deployedStrategy } = await makeDeployedPreStrategy();
      const asObj = deployedStrategy.toObj();
      const fromJson = DeployedPreStrategy.fromObj(asObj);
      expect(fromJson.equals(deployedStrategy)).toBeTruthy();
    });

    it('serializes to a JSON', async () => {
      const { deployedStrategy } = await makeDeployedPreStrategy();
      const asJson = deployedStrategy.toJSON();
      const fromJson = DeployedPreStrategy.fromJSON(asJson);
      expect(fromJson.equals(deployedStrategy)).toBeTruthy();
    });
  });
});

describe('PreDecrypter', () => {
  it('serializes to a plain object', async () => {
    const { deployedStrategy } = await makeDeployedPreStrategy();
    const asObj = deployedStrategy.decrypter.toObj();
    const fromJson = PreDecrypter.fromObj(asObj);
    expect(fromJson.equals(deployedStrategy.decrypter)).toBeTruthy();
  });

  it('serializes to JSON', async () => {
    const { deployedStrategy } = await makeDeployedPreStrategy();
    const asJson = deployedStrategy.decrypter.toJSON();
    const fromJson = PreDecrypter.fromJSON(asJson);
    expect(fromJson.equals(deployedStrategy.decrypter)).toBeTruthy();
  });
});
