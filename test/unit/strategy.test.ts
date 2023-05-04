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
  fakeUrsulas,
  fakeWeb3Provider,
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
  const aliceSecretKey = SecretKey.fromBEBytes(aliceSecretKeyBytes);
  const bobSecretKey = SecretKey.fromBEBytes(bobSecretKeyBytes);
  const aliceProvider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
  Date.now = jest.fn(() => 1487076708000);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('can create Strategy from configuration', async () => {
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      undefined,
      aliceSecretKey,
      bobSecretKey
    );

    const expectedUrsulas = mockedUrsulas.map(
      (ursula) => ursula.checksumAddress
    );
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(testStrategy.cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  it('can export to JSON', async () => {
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      undefined,
      aliceSecretKey,
      bobSecretKey,
      new Date('2017-02-14T12:51:48.000Z'),
      new Date('2123-03-16T12:51:48.000Z')
    );

    const configJSON = testStrategy.toJSON();
    expect(configJSON).toEqual(strategyJSON);
    expect(getUrsulasSpy).toHaveBeenCalled();
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
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
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
  const aliceSecretKey = SecretKey.fromBEBytes(aliceSecretKeyBytes);
  const bobSecretKey = SecretKey.fromBEBytes(bobSecretKeyBytes);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('can export to JSON', async () => {
    const aliceProvider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
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
      bobSecretKey,
      new Date('2017-02-14T12:51:48.000Z'),
      new Date('2123-03-16T12:51:48.000Z')
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
    const importedStrategy = DeployedStrategy.fromJSON(deployedStrategyJSON);
    const configJSON = importedStrategy.toJSON();
    expect(configJSON).toEqual(deployedStrategyJSON);
  });

  it('can encrypt and decrypt', async () => {
    const aliceProvider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
    const bobProvider = fakeWeb3Provider(bobSecretKey.toBEBytes());
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
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
    encrypter.conditions = new ConditionSet([ownsNFT]);
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

    const decryptedMessage = await decrypter.retrieveAndDecrypt(
      [encryptedMessageKit],
      bobProvider
    );
    expect(getUrsulasSpy2).toHaveBeenCalled();
    expect(retrieveCFragsSpy).toHaveBeenCalled();
    expect(decryptedMessage[0]).toEqual(toBytes(plaintext));
  });
});

describe('tDecDecrypter', () => {
  const importedStrategy = DeployedStrategy.fromJSON(deployedStrategyJSON);

  it('can export to JSON', () => {
    const configJSON = importedStrategy.decrypter.toJSON();
    expect(configJSON).toEqual(decrypterJSON);
  });

  it('can import from JSON', () => {
    const decrypter = tDecDecrypter.fromJSON(decrypterJSON);
    const configJSON = decrypter.toJSON();
    expect(configJSON).toEqual(decrypterJSON);
  });
});
