import { SecretKey } from '@nucypher/nucypher-core';

import { conditions } from '../../src';
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
  fakeTDecFlow,
  fakeUrsulas,
  fakeWeb3Provider,
  makeCohort,
  mockDecrypt,
  mockGetUrsulas,
  mockInitializeRitual,
} from '../utils';

import { aliceSecretKeyBytes } from './testVariables';

const {
  predefined: { ERC721Ownership },
  ConditionSet,
} = conditions;

// Shared test variables
const aliceSecretKey = SecretKey.fromBEBytes(aliceSecretKeyBytes);
const aliceProvider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
const ownsNFT = new ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: 5,
});
const conditionSet = new ConditionSet([ownsNFT]);
const mockedUrsulas = fakeUrsulas().slice(0, 3);
const variant = FerveoVariant.Precomputed;

const makeCbdStrategy = async () => {
  const cohort = await makeCohort(mockedUrsulas);
  const strategy = CbdStrategy.create(cohort, conditionSet);
  expect(strategy.cohort).toEqual(cohort);
  return strategy;
};

async function makeDeployedCbdStrategy() {
  const strategy = await makeCbdStrategy();

  const mockedDkg = fakeDkgFlow(variant, 0);
  const mockedDkgRitual = fakeDkgRitual(mockedDkg);
  const web3Provider = fakeWeb3Provider(aliceSecretKey.toBEBytes());
  const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
  const initializeRitualSpy = mockInitializeRitual(mockedDkgRitual);
  const deployedStrategy = await strategy.deploy(web3Provider);

  expect(getUrsulasSpy).toHaveBeenCalled();
  expect(initializeRitualSpy).toHaveBeenCalled();

  return { mockedDkg, deployedStrategy };
}

describe('CbdStrategy', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a strategy', async () => {
    await makeCbdStrategy();
  });

  it('can deploy and return a CbdDeployedStrategy', async () => {
    await makeDeployedCbdStrategy();
  });

  describe('serialization', () => {
    it('serializes to a plain object', async () => {
      const strategy = await makeCbdStrategy();
      const asObj = strategy.toObj();
      const fromObj = CbdStrategy.fromObj(asObj);
      expect(fromObj.equals(strategy)).toBeTruthy();
    });

    it('serializes to a JSON', async () => {
      const strategy = await makeCbdStrategy();
      const asJson = strategy.toJSON();
      const fromJson = CbdStrategy.fromJSON(asJson);
      expect(fromJson.equals(strategy)).toBeTruthy();
    });
  });
});

describe('CbdDeployedStrategy', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('can encrypt and decrypt', async () => {
    const { mockedDkg, deployedStrategy } = await makeDeployedCbdStrategy();

    const message = 'this is a secret';
    const { ciphertext, aad } = deployedStrategy.encrypter.encryptMessageCbd(
      message,
      conditionSet
    );

    // Setup mocks for `retrieveAndDecrypt`
    const { decryptionShares } = fakeTDecFlow({
      ...mockedDkg,
      variant,
      message: toBytes(message),
      aad,
      ciphertext,
    });
    const getUrsulasSpy2 = mockGetUrsulas(mockedUrsulas);
    const decryptSpy = mockDecrypt(decryptionShares);

    const decryptedMessage =
      await deployedStrategy.decrypter.retrieveAndDecrypt(
        aliceProvider,
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

  describe('serialization', () => {
    it('serializes to a plaintext object', async () => {
      const { deployedStrategy } = await makeDeployedCbdStrategy();
      const asJson = deployedStrategy.toJSON();
      const fromJson = DeployedCbdStrategy.fromJSON(asJson);
      expect(fromJson.equals(deployedStrategy)).toBeTruthy();
    });

    it('serializes to a JSON', async () => {
      const { deployedStrategy } = await makeDeployedCbdStrategy();
      const asJson = deployedStrategy.toJSON();
      const fromJson = DeployedCbdStrategy.fromJSON(asJson);
      expect(fromJson.equals(deployedStrategy)).toBeTruthy();
    });
  });
});

describe('CbdTDecDecrypter', () => {
  it('serializes to a plain object', async () => {
    const { deployedStrategy } = await makeDeployedCbdStrategy();
    const configObj = deployedStrategy.decrypter.toObj();
    const fromObj = CbdTDecDecrypter.fromObj(configObj);
    expect(fromObj.equals(deployedStrategy.decrypter)).toBeTruthy();
  });

  it('serializes to a JSON', async () => {
    const { deployedStrategy } = await makeDeployedCbdStrategy();
    const configJSON = deployedStrategy.decrypter.toJSON();
    const fromJSON = CbdTDecDecrypter.fromJSON(configJSON);
    expect(fromJSON.equals(deployedStrategy.decrypter)).toBeTruthy();
  });
});
