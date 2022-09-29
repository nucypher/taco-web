import { SecretKey, VerifiedKeyFrag } from '@nucypher/nucypher-core';

import {
  Cohort,
  Conditions,
  ConditionSet,
  DeployedStrategy,
  Strategy,
} from '../../src';
import { Ursula } from '../../src/characters/porter';
import {
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockGetUrsulas,
  mockMakeTreasureMap,
  mockPublishToBlockchain,
  mockRetrieveCFragsRequest,
  mockUrsulas,
  mockWeb3Provider,
} from '../utils';

import {
  aliceSecretKeyBytes,
  bobSecretKeyBytes,
  DeployedStrategyJSON,
  strategyJSON,
} from './testVariables';

describe('Strategy', () => {
  const cohortConfig = {
    threshold: 2,
    shares: 3,
    porterUri: 'https://porter-ibex.nucypher.community',
  };
  const aliceSecretKey = SecretKey.fromBytes(aliceSecretKeyBytes);
  const bobSecretKey = SecretKey.fromBytes(bobSecretKeyBytes);
  const startDate = new Date(900000000000);
  const endDate = new Date(900000100000);
  const aliceProvider = mockWeb3Provider(aliceSecretKey.toSecretBytes());

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('can create Strategy from configuration', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      startDate,
      endDate,
      undefined,
      aliceSecretKey
    );

    const expectedUrsulas = [
      '0x5cf1703a1c99a4b42eb056535840e93118177232',
      '0x7fff551249d223f723557a96a0e1a469c79cc934',
      '0x9c7c824239d3159327024459ad69bb215859bd25',
    ];
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(testStrategy.cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  it('can export to JSON', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      startDate,
      endDate,
      undefined,
      aliceSecretKey,
      bobSecretKey
    );

    const configJSON = testStrategy.toJSON();
    expect(configJSON).toEqual(strategyJSON);
  });

  it('can import from JSON', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);

    const testStrategy = Strategy.fromJSON(strategyJSON);
    const expectedUrsulas = [
      '0x5cf1703a1c99a4b42eb056535840e93118177232',
      '0x7fff551249d223f723557a96a0e1a469c79cc934',
      '0x9c7c824239d3159327024459ad69bb215859bd25',
    ];
    expect(testStrategy.cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  it('can deploy and return DeployedStrategy', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      new Date(),
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      undefined,
      aliceSecretKey
    );
    const testDeployed = await testStrategy.deploy('test', aliceProvider);
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
    expect(makeTreasureMapSpy).toHaveBeenCalled();

    expect(testDeployed.label).toEqual('test');
  });
});

describe('Deployed Strategy', () => {
  const cohortConfig = {
    threshold: 2,
    shares: 3,
    porterUri: 'https://porter-ibex.nucypher.community',
  };
  const aliceSecretKey = SecretKey.fromBytes(aliceSecretKeyBytes);
  const bobSecretKey = SecretKey.fromBytes(bobSecretKeyBytes);
  const aliceProvider = mockWeb3Provider(aliceSecretKey.toSecretBytes());
  const bobProvider = mockWeb3Provider(SecretKey.random().toSecretBytes());


  it('can export to JSON', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      new Date(1000000000000),
      new Date(2100000000000),
      undefined,
      aliceSecretKey,
      bobSecretKey
    );
    const testDeployed = await testStrategy.deploy('test', aliceProvider);
    const configJSON = testDeployed.toJSON();
    expect(configJSON).toEqual(DeployedStrategyJSON);
  });

  it('can import from JSON', async () => {
    const importedStrategy = DeployedStrategy.fromJSON(
      aliceProvider,
      DeployedStrategyJSON
    );
    const configJSON = importedStrategy.toJSON();
    expect(configJSON).toEqual(DeployedStrategyJSON);
  });

  it('can encrypt and decrypt', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      new Date(),
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      undefined,
      aliceSecretKey
    );
    const testDeployed = await testStrategy.deploy('test', aliceProvider);

    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
    expect(makeTreasureMapSpy).toHaveBeenCalled();

    const encrypter = testDeployed.encrypter;
    const decrypter = testDeployed.decrypter;

    const ownsNFT = new Conditions.ERC721Ownership({
      contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      parameters: [3591],
    });

    const plaintext = 'this is a secret';
    const conditions = new ConditionSet([ownsNFT]);
    encrypter.conditions = conditions;
    const encryptedMessageKit = encrypter.encryptMessage(plaintext);
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

    const conditionContext = conditions.buildContext(bobProvider);
    const decryptedMessage = await decrypter.retrieveAndDecrypt(
      [encryptedMessageKit],
      conditionContext
    );

    expect(getUrsulasSpy2).toHaveBeenCalled();
    expect(retrieveCFragsSpy).toHaveBeenCalled();
    expect(decryptedMessage[0]).toEqual(plaintext);
  });
});
