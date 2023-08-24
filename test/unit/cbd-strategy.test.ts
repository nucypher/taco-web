import { SessionStaticSecret } from '@nucypher/nucypher-core';
import { createWalletClient, http } from 'viem';
import { polygonMumbai } from 'viem/chains';

import { conditions } from '../../src';
import { FerveoVariant } from '../../src';
import { CbdStrategy, DeployedCbdStrategy } from '../../src';
import { ThresholdDecrypter } from '../../src/characters/cbd-recipient';
import { toBytes } from '../../src/utils';
import { toPublicClient } from '../../src/viem';
import {
  fakeDkgFlow,
  fakeDkgParticipants,
  fakeDkgRitual,
  fakeTDecFlow,
  fakeUrsulas,
  makeCohort,
  mockCbdDecrypt,
  mockGetExistingRitual,
  mockGetParticipants,
  mockGetUrsulas,
  mockRandomSessionStaticSecret,
  testWalletClient,
} from '../utils';

const {
  predefined: { ERC721Ownership },
  ConditionExpression,
} = conditions;

// Shared test variables
const ownsNFT = new ERC721Ownership({
  contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
  parameters: [3591],
  chain: 5,
});
const conditionExpr = new ConditionExpression(ownsNFT);
const ursulas = fakeUrsulas();
const variant = FerveoVariant.precomputed;
const ritualId = 0;

const makeCbdStrategy = async () => {
  const cohort = await makeCohort(ursulas);
  const strategy = CbdStrategy.create(cohort);
  expect(strategy.cohort).toEqual(cohort);
  return strategy;
};

async function makeDeployedCbdStrategy() {
  const strategy = await makeCbdStrategy();

  const mockedDkg = fakeDkgFlow(variant, 0, 4, 4);
  const mockedDkgRitual = fakeDkgRitual(mockedDkg);
  const walletClient = createWalletClient({
    chain: polygonMumbai,
    transport: http(),
  });
  const publicClient = toPublicClient(walletClient);
  const getUrsulasSpy = mockGetUrsulas(ursulas);
  const getExistingRitualSpy = mockGetExistingRitual(mockedDkgRitual);
  const deployedStrategy = await strategy.deploy(publicClient, ritualId);

  expect(getUrsulasSpy).toHaveBeenCalled();
  expect(getExistingRitualSpy).toHaveBeenCalled();

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
describe('CbdDeployedStrategy', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('can encrypt and decrypt', async () => {
    const { mockedDkg, deployedStrategy } = await makeDeployedCbdStrategy();

    const message = 'this is a secret';
    const { ciphertext, aad } = deployedStrategy
      .makeEncrypter(conditionExpr)
      .encryptMessageCbd(message);

    // Setup mocks for `retrieveAndDecrypt`
    const { decryptionShares } = fakeTDecFlow({
      ...mockedDkg,
      message: toBytes(message),
      aad,
      ciphertext,
    });
    const { participantSecrets, participants } = fakeDkgParticipants(
      mockedDkg.ritualId,
      variant
    );
    const requesterSessionKey = SessionStaticSecret.random();
    const decryptSpy = mockCbdDecrypt(
      mockedDkg.ritualId,
      decryptionShares,
      participantSecrets,
      requesterSessionKey.publicKey()
    );
    const getParticipantsSpy = mockGetParticipants(participants);
    const getUrsulasSpy = mockGetUrsulas(ursulas);
    const sessionKeySpy = mockRandomSessionStaticSecret(requesterSessionKey);

    const decryptedMessage =
      await deployedStrategy.decrypter.retrieveAndDecrypt(
        testWalletClient,
        conditionExpr,
        ciphertext
      );
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(getParticipantsSpy).toHaveBeenCalled();
    expect(sessionKeySpy).toHaveBeenCalled();
    expect(decryptSpy).toHaveBeenCalled();
    expect(decryptedMessage).toEqual(toBytes(message));
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

describe('ThresholdDecrypter', () => {
  it('serializes to a plain object', async () => {
    const { deployedStrategy } = await makeDeployedCbdStrategy();
    const configObj = deployedStrategy.decrypter.toObj();
    const fromObj = ThresholdDecrypter.fromObj(configObj);
    expect(fromObj.equals(deployedStrategy.decrypter)).toBeTruthy();
  });

  it('serializes to a JSON', async () => {
    const { deployedStrategy } = await makeDeployedCbdStrategy();
    const configJSON = deployedStrategy.decrypter.toJSON();
    const fromJSON = ThresholdDecrypter.fromJSON(configJSON);
    expect(fromJSON.equals(deployedStrategy.decrypter)).toBeTruthy();
  });
});