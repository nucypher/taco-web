import {
  EncryptedTreasureMap,
  SecretKey,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';

import {
  Cohort,
  Conditions,
  ConditionSet,
  DeployedStrategy,
  Strategy,
  tDecDecrypter,
} from '../../src';
import { Ursula } from '../../src/characters/porter';
import { fromBase64, toBytes } from '../../src/utils';
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
  decrypterJSON,
  deployedStrategyJSON,
  encryptedTreasureMapBase64,
  strategyJSON,
} from './testVariables';

describe('Strategy', () => {
  const cohortConfig = {
    threshold: 2,
    shares: 3,
    porterUri: 'https://_this.should.crash',
  };
  const aliceSecretKey = SecretKey.fromBytes(aliceSecretKeyBytes);
  const bobSecretKey = SecretKey.fromBytes(bobSecretKeyBytes);
  const aliceProvider = mockWeb3Provider(aliceSecretKey.toSecretBytes());
  Date.now = jest.fn(() => 1487076708000);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('can create Strategy from configuration', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      undefined,
      aliceSecretKey,
      bobSecretKey
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
    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      undefined,
      aliceSecretKey,
      bobSecretKey
    );

    const configJSON = testStrategy.toJSON();
    expect(configJSON).toEqual(strategyJSON);
  });

  it('can import from JSON', async () => {
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
    const testStrategy = Strategy.create(testCohort, undefined, aliceSecretKey);
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
    porterUri: 'https://_this.should.crash',
  };
  const aliceSecretKey = SecretKey.fromBytes(aliceSecretKeyBytes);
  const bobSecretKey = SecretKey.fromBytes(bobSecretKeyBytes);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('can export to JSON', async () => {
    const aliceProvider = mockWeb3Provider(aliceSecretKey.toSecretBytes());
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap(
      EncryptedTreasureMap.fromBytes(fromBase64(encryptedTreasureMapBase64))
    );

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      undefined,
      aliceSecretKey,
      bobSecretKey
    );
    const testDeployed = await testStrategy.deploy('test', aliceProvider);
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(makeTreasureMapSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();

    const configJSON = testDeployed.toJSON();
    expect(configJSON).toEqual(deployedStrategyJSON);
  });

  it('can import from JSON', async () => {
    const aliceProvider = mockWeb3Provider(aliceSecretKey.toSecretBytes());
    const importedStrategy = DeployedStrategy.fromJSON(
      aliceProvider,
      deployedStrategyJSON
    );
    const configJSON = importedStrategy.toJSON();
    expect(configJSON).toEqual(deployedStrategyJSON);
  });

  it('can encrypt and decrypt', async () => {
    const aliceProvider = mockWeb3Provider(aliceSecretKey.toSecretBytes());
    const bobProvider = mockWeb3Provider(bobSecretKey.toSecretBytes());
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      undefined,
      aliceSecretKey,
      bobSecretKey
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
      chain: 5,
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
    expect(decryptedMessage[0]).toEqual(toBytes(plaintext));
  });
});

describe('tDecDecrypter', () => {
  const aliceSecretKey = SecretKey.fromBytes(aliceSecretKeyBytes);
  const aliceProvider = mockWeb3Provider(aliceSecretKey.toSecretBytes());
  const importedStrategy = DeployedStrategy.fromJSON(
    aliceProvider,
    deployedStrategyJSON
  );

  it('can export to JSON', () => {
    const decrypter = importedStrategy.decrypter;
    const configJSON = decrypter.toJSON();
    expect(configJSON).toEqual(decrypterJSON);
  });

  it('can import from JSON', () => {
    const decrypter = tDecDecrypter.fromJSON(decrypterJSON);
    const configJSON = decrypter.toJSON();
    expect(configJSON).toEqual(decrypterJSON);
  });
});
