import {
  EncryptedTreasureMap,
  SecretKey,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';

import {
  conditions,
  DeployedPreStrategy,
  PreStrategy,
  PreTDecDecrypter,
} from '../../src';
import { Ursula } from '../../src/characters/porter';
import { fromBase64, toBytes } from '../../src/utils';
import {
  fakeUrsulas,
  fakeWeb3Provider,
  makeCohort,
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockGetUrsulas,
  mockMakeTreasureMap,
  mockPublishToBlockchain,
  mockRetrieveCFragsRequest,
} from '../utils';

import {
  aliceSecretKeyBytes,
  bobSecretKeyBytes,
  deployedStrategyJSON,
  encryptedTreasureMapBase64,
} from './testVariables';

const {
  predefined: { ERC721Ownership },
  ConditionSet,
} = conditions;

// Shared test variables
const aliceSecretKey = SecretKey.fromBEBytes(aliceSecretKeyBytes);
const bobSecretKey = SecretKey.fromBEBytes(bobSecretKeyBytes);
const aliceProvider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
Date.now = jest.fn(() => 1487076708000);
const ownsNFT = new ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: 5,
});
const conditionSet = new ConditionSet([ownsNFT]);
const mockedUrsulas = fakeUrsulas().slice(0, 3);

describe('PreStrategy', () => {
  const cohortConfig = {
    threshold: 2,
    shares: 3,
    porterUri: 'https://_this.should.crash',
  };
  const aliceSecretKey = SecretKey.fromBEBytes(aliceSecretKeyBytes);
  const bobSecretKey = SecretKey.fromBEBytes(bobSecretKeyBytes);
  const aliceProvider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
  Date.now = jest.fn(() => 1487076708000);

describe('Strategy', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a PreStrategy', async () => {
    const cohort = await makeCohort(mockedUrsulas);
    const strategy = PreStrategy.create(
      cohort,
      conditionSet,
      aliceSecretKey,
      bobSecretKey
    );
    expect(strategy.cohort).toEqual(cohort);
  });

  it('serializes to plain object', async () => {
    const cohort = await makeCohort(mockedUrsulas);
    const strategy = PreStrategy.create(
      cohort,
      conditionSet,
      aliceSecretKey,
      bobSecretKey
    );
    const asObject = strategy.toObj();
    const fromObject = PreStrategy.fromObj(asObject);
    expect(fromObject.equals(strategy)).toBeTruthy();
  });

  it('serializes to JSON', async () => {
    const cohort = await makeCohort(mockedUrsulas);
    const strategy = PreStrategy.create(
      cohort,
      conditionSet,
      aliceSecretKey,
      bobSecretKey
    );

    const asJson = strategy.toJSON();
    const fromJSON = PreStrategy.fromJSON(asJson);
    expect(fromJSON.equals(strategy)).toBeTruthy();
  });

  it('deploys strategy', async () => {
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const cohort = await makeCohort(mockedUrsulas);
    const strategy = PreStrategy.create(
      cohort, conditionSet,
      aliceSecretKey
    );
    const label = 'test';

    const deployedStrategy = await strategy.deploy(label, aliceProvider);
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
    expect(makeTreasureMapSpy).toHaveBeenCalled();

    expect(deployedStrategy.cohort).toEqual(cohort);
    expect(deployedStrategy.conditionSet).toEqual(conditionSet);
    expect(deployedStrategy.label).toEqual(label);
  });
});

describe('PreDeployedStrategy', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('serializes to JSON', async () => {
    const aliceProvider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap(
      EncryptedTreasureMap.fromBytes(fromBase64(encryptedTreasureMapBase64))
    );

    const cohort = await makeCohort(mockedUrsulas);
    const strategy = PreStrategy.create(
      cohort,
      conditionSet,
      aliceSecretKey,
      bobSecretKey
    );

    const strategyAsJson = strategy.toJSON();
    const strategyFromJson = Strategy.fromJSON(strategyAsJson);
    expect(strategyFromJson.equals(strategy)).toBeTruthy();

    const deployedStrategy = await strategy.deploy('test', aliceProvider);
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(makeTreasureMapSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();

    const asJson = deployedStrategy.toJSON();
    const fromJson = DeployedPreStrategy.fromJSON(asJson);
    expect(fromJson.equals(deployedStrategy)).toBeTruthy();
  });

  it('encrypts and decrypts', async () => {
    const aliceProvider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
    const bobProvider = fakeWeb3Provider(bobSecretKey.toBEBytes());
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const cohort = await makeCohort(mockedUrsulas);
    const strategy = PreStrategy.create(
      cohort,
      conditionSet,
      aliceSecretKey,
      bobSecretKey
    );
    const deployedStrategy = await strategy.deploy('test', aliceProvider);

    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
    expect(makeTreasureMapSpy).toHaveBeenCalled();

    const encrypter = deployedStrategy.encrypter;
    const decrypter = deployedStrategy.decrypter;

    const plaintext = 'this is a secret';
    encrypter.conditions = conditionSet;
    const encryptedMessageKit = encrypter.encryptMessagePre(plaintext);

    // Setup mocks for `retrieveAndDecrypt`
    const getUrsulasSpy2 = mockGetUrsulas(mockedUrsulas);
    const ursulaAddresses = (
      makeTreasureMapSpy.mock.calls[0][0] as readonly Ursula[]
    ).map((u) => u.checksumAddress);
    const verifiedKFrags = makeTreasureMapSpy.mock
      .calls[0][1] as readonly VerifiedKeyFrag[];
    const retrieveCFragsSpy = mockRetrieveCFragsRequest(
      ursulaAddresses,
      verifiedKFrags,
      encryptedMessageKit.capsule
    );

    const decryptedMessage = await decrypter.retrieveAndDecrypt(
      [encryptedMessageKit],
      bobProvider
    );
    expect(getUrsulasSpy2).toHaveBeenCalled();
    expect(retrieveCFragsSpy).toHaveBeenCalled();
    expect(decryptedMessage[0]).toEqual(toBytes(plaintext));

    const serialized = deployedStrategy.toJSON();
    const deserialized = DeployedStrategy.fromJSON(serialized);
    expect(deserialized.equals(deployedStrategy)).toBeTruthy();
  });
});

describe('pre tdec decrypter', () => {
  const decrypter = DeployedPreStrategy.fromJSON(deployedStrategyJSON).decrypter;

  it('serializes to JSON', () => {
    const asJson = decrypter.toJSON();
    const fromJson = PreTDecDecrypter.fromJSON(asJson);
    expect(fromJson.equals(decrypter)).toBeTruthy();
  });
});
