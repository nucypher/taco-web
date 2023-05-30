import { SecretKey } from '@nucypher/nucypher-core';

import { Cohort, conditions } from '../../src';
import { CbdTDecDecrypter } from '../../src/characters/cbd-recipient';
import { FerveoVariant } from '../../src/dkg';
import {
  CbdStrategy,
  DeployedCbdStrategy,
} from '../../src/sdk/strategy/cbd-strategy';
import { toBytes } from '../../src/utils';
import {
  fakeDkgFlow,
  fakeDkgRitual,
  fakeDkgTDecFlowE2e,
  fakeTDecFlow,
  fakeUrsulas,
  fakeWeb3Provider,
  mockDecrypt,
  mockGetUrsulas,
  mockInitializeRitual,
} from '../utils';

import {
  aliceSecretKeyBytes,
  cbdDecrypterJSON,
  cbdStrategyJSON,
  deployedCbdStrategyObj,
  preStrategyJSON,
} from './testVariables';

const {
  predefined: { ERC721Ownership },
  ConditionSet,
} = conditions;

describe('CbdStrategy', () => {
  const cohortConfig = {
    threshold: 2,
    shares: 3,
    porterUri: 'https://_this.should.crash',
  };
  const aliceSecretKey = SecretKey.fromBEBytes(aliceSecretKeyBytes);
  const aliceProvider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
  Date.now = jest.fn(() => 1487076708000);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('can create CbdStrategy from configuration', async () => {
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = CbdStrategy.create(testCohort, undefined);

    const expectedUrsulas = mockedUrsulas.map(
      (ursula) => ursula.checksumAddress
    );
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(testStrategy.cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  // TODO: Update this test
  it('can export to JSON', async () => {
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = CbdStrategy.create(testCohort, undefined);

    const configJSON = testStrategy.toJSON();
    expect(configJSON).toEqual(cbdStrategyJSON);
    expect(getUrsulasSpy).toHaveBeenCalled();
  });

  it('can import from JSON', async () => {
    const testStrategy = CbdStrategy.fromJSON(preStrategyJSON);
    const expectedUrsulas = [
      '0x5cf1703a1c99a4b42eb056535840e93118177232',
      '0x7fff551249d223f723557a96a0e1a469c79cc934',
      '0x9c7c824239d3159327024459ad69bb215859bd25',
    ];
    expect(testStrategy.cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  it('can deploy and return DeployedStrategy', async () => {
    const variant = FerveoVariant.Precomputed;
    const fakeE2ERitual = fakeDkgTDecFlowE2e(variant);
    const fakeRitual = fakeDkgRitual(fakeE2ERitual);
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const initRitualSpy = mockInitializeRitual(fakeRitual);

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = CbdStrategy.create(testCohort, undefined);
    const testDeployed = await testStrategy.deploy(aliceProvider);
    expect(testDeployed.dkgRitual.id).toEqual(fakeRitual.id);
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(initRitualSpy).toHaveBeenCalled();
  });
});

describe('CbdDeployedStrategy', () => {
  const cohortConfig = {
    threshold: 2,
    shares: 3,
    porterUri: 'https://_this.should.crash',
  };
  const aliceSecretKey = SecretKey.fromBEBytes(aliceSecretKeyBytes);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('can import from JSON', async () => {
    const json = JSON.stringify(deployedCbdStrategyObj);
    const importedStrategy = DeployedCbdStrategy.fromJSON(json);
    const configJSON = importedStrategy.toJSON();
    expect(configJSON).toEqual(json);
  });

  it('can export to JSON', async () => {
    const aliceProvider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const fakeDkg = fakeDkgFlow(FerveoVariant.Precomputed, 0);
    const fakeRitual = fakeDkgRitual(fakeDkg);
    const initializeRitualSpy = mockInitializeRitual(fakeRitual);

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = CbdStrategy.create(testCohort, undefined);
    const testDeployed = await testStrategy.deploy(aliceProvider);
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(initializeRitualSpy).toHaveBeenCalled();

    const asJson = testDeployed.toJSON();
    expect(asJson).toBeDefined();
    const asObj = JSON.parse(asJson);
    // TODO: Will not match until we hardcode validator keypairs in tests
    // expect(asJson).toEqual(deployedCbdStrategyJSON);
    // So instead we do:
    delete asObj.dkgRitual.dkgPublicKey;
    const expectedObj: Partial<typeof asObj> = Object.assign(
      deployedCbdStrategyObj
    );
    delete expectedObj.dkgRitual.dkgPublicKey;
    expect(asObj).toEqual(expectedObj);
  });

  it('can encrypt and decrypt', async () => {
    const variant = FerveoVariant.Precomputed;
    const fakeDkg = fakeDkgFlow(variant, 0);
    const fakeRitual = fakeDkgRitual(fakeDkg);
    const web3Provider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const initializeRitualSpy = mockInitializeRitual(fakeRitual);

    const cohort = await Cohort.create(cohortConfig);
    const strategy = CbdStrategy.create(cohort, undefined);

    const deployedStrategy = await strategy.deploy(web3Provider);
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(initializeRitualSpy).toHaveBeenCalled();

    const encrypter = deployedStrategy.encrypter;
    const decrypter = deployedStrategy.decrypter;

    const ownsNFT = new ERC721Ownership({
      contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      parameters: [3591],
      chain: 5,
    });
    const conditionSet = new ConditionSet([ownsNFT]);

    const message = 'this is a secret';
    const { ciphertext, aad } = encrypter.encryptMessageCbd(
      message,
      conditionSet
    );

    // Setup mocks for `retrieveAndDecrypt`
    const { decryptionShares } = fakeTDecFlow({
      ...fakeDkg,
      variant,
      message: toBytes(message),
      aad,
      ciphertext,
    });
    const getUrsulasSpy2 = mockGetUrsulas(mockedUrsulas);
    const decryptSpy = mockDecrypt(decryptionShares);

    const decryptedMessage = await decrypter.retrieveAndDecrypt(
      web3Provider,
      conditionSet,
      deployedStrategy.dkgRitual,
      variant,
      ciphertext,
      aad
    );
    expect(getUrsulasSpy2).toHaveBeenCalled();
    expect(decryptSpy).toHaveBeenCalled();
    expect(decryptedMessage[0]).toEqual(toBytes(message));
  });
});

describe('cbd tdec decrypter', () => {
  const importedStrategy = DeployedCbdStrategy.fromJSON(
    JSON.stringify(deployedCbdStrategyObj)
  );

  it('can export to JSON', () => {
    const configJSON = importedStrategy.decrypter.toJSON();
    expect(configJSON).toEqual(cbdDecrypterJSON);
  });

  it('can import from JSON', () => {
    const decrypter = CbdTDecDecrypter.fromJSON(cbdDecrypterJSON);
    const configJSON = decrypter.toJSON();
    expect(configJSON).toEqual(cbdDecrypterJSON);
  });
});
