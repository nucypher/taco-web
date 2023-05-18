import { SecretKey } from '@nucypher/nucypher-core';

import { Cohort, conditions } from '../../src';
import { FerveoVariant } from '../../src/dkg';
import { CbdStrategy } from '../../src/sdk/strategy/cbd-strategy';
import { toBytes } from '../../src/utils';
import {
  fakeDkgRitual,
  fakeDkgRitualE2e,
  fakeUrsulas,
  fakeWeb3Provider,
  mockDecrypt,
  mockGetUrsulas,
  mockInitializeRitual,
} from '../utils';

import {
  aliceSecretKeyBytes,
  bobSecretKeyBytes,
  strategyJSON,
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
  const bobSecretKey = SecretKey.fromBEBytes(bobSecretKeyBytes);
  const aliceProvider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
  Date.now = jest.fn(() => 1487076708000);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('can create CbdStrategy from configuration', async () => {
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = CbdStrategy.create(
      testCohort,
      undefined,
      bobSecretKey
    );

    const expectedUrsulas = mockedUrsulas.map(
      (ursula) => ursula.checksumAddress
    );
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(testStrategy.cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  // TODO: Update this test
  it('can export to JSON', async () => {
    // const mockedUrsulas = fakeUrsulas().slice(0, 3);
    // const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    // const testCohort = await Cohort.create(cohortConfig);
    // const testStrategy = CbdStrategy.create(
    //   testCohort,
    //   undefined,
    //   bobSecretKey
    // );
    //
    // const configJSON = testStrategy.toJSON();
    // expect(configJSON).toEqual(strategyJSON);
    // expect(getUrsulasSpy).toHaveBeenCalled();
  });

  it('can import from JSON', async () => {
    const testStrategy = CbdStrategy.fromJSON(strategyJSON);
    const expectedUrsulas = [
      '0x5cf1703a1c99a4b42eb056535840e93118177232',
      '0x7fff551249d223f723557a96a0e1a469c79cc934',
      '0x9c7c824239d3159327024459ad69bb215859bd25',
    ];
    expect(testStrategy.cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  it('can deploy and return DeployedStrategy', async () => {
    const fakeRitual = fakeDkgRitual(FerveoVariant.Precomputed);
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const initRitualSpy = mockInitializeRitual(fakeRitual);

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = CbdStrategy.create(
      testCohort,
      undefined,
      aliceSecretKey
    );
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
  const bobSecretKey = SecretKey.fromBEBytes(bobSecretKeyBytes);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // TODO: Update this test
  // it('can export to JSON', async () => {
  // const aliceProvider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
  // const mockedUrsulas = fakeUrsulas().slice(0, 3);
  // const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
  //
  // const testCohort = await Cohort.create(cohortConfig);
  // const testStrategy = CbdStrategy.create(
  //   testCohort,
  //   undefined,
  //   bobSecretKey
  // );
  // const testDeployed = await testStrategy.deploy(aliceProvider);
  // expect(getUrsulasSpy).toHaveBeenCalled();
  //
  // const configJSON = testDeployed.toJSON();
  // expect(configJSON).toEqual(deployedStrategyJSON);
  // });

  // TODO: Update this test
  // it('can import from JSON', async () => {
  //   const importedStrategy = DeployedCbdStrategy.fromJSON(deployedStrategyJSON);
  //   const configJSON = importedStrategy.toJSON();
  //   expect(configJSON).toEqual(deployedStrategyJSON);
  // });

  it('can encrypt and decrypt', async () => {
    const variant = FerveoVariant.Precomputed;
    const fakeRitual = fakeDkgRitual(variant);
    const { decryptionShares } = fakeDkgRitualE2e(variant);
    const web3Provider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
    const mockedUrsulas = fakeUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const initializeRitualSpy = mockInitializeRitual(fakeRitual);

    const cohort = await Cohort.create(cohortConfig);
    const strategy = CbdStrategy.create(cohort, undefined, bobSecretKey);

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

    const plaintext = 'this is a secret';
    const { ciphertext, aad } = encrypter.encryptMessageCbd(
      plaintext,
      conditionSet
    );

    // Setup mocks for `retrieveAndDecrypt`
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
    expect(decryptedMessage[0]).toEqual(toBytes(plaintext));
  });
});

// TODO: Update this test
describe('cbd tdec decrypter', () => {
  // const importedStrategy = DeployedCbdStrategy.fromJSON(deployedStrategyJSON);
  //
  // it('can export to JSON', () => {
  //   const configJSON = importedStrategy.decrypter.toJSON();
  //   expect(configJSON).toEqual(decrypterJSON);
  // });
  //
  // it('can import from JSON', () => {
  //   const decrypter = PreTDecDecrypter.fromJSON(decrypterJSON);
  //   const configJSON = decrypter.toJSON();
  //   expect(configJSON).toEqual(decrypterJSON);
  // });
});
