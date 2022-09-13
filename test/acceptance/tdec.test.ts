import { SecretKey, VerifiedKeyFrag } from '@nucypher/nucypher-core';

import { Conditions, ConditionSet } from '../../src';
import { Ursula } from '../../src/characters/porter';
import {
  generateTDecEntities,
  TDecEntitiesFromConfig,
} from '../../src/characters/tDec';
import { toBytes } from '../../src/utils';
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

describe('threshold decryption', () => {
  const threshold = 3;
  const shares = 5;
  const label = 'test';
  const startDate = new Date();
  const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // In 30 days
  const aliceSecretKey = SecretKey.random();
  const aliceProvider = mockWeb3Provider(aliceSecretKey.toSecretBytes());
  const plaintext = toBytes('plaintext-message');
  const bobProvider = mockWeb3Provider(SecretKey.random().toSecretBytes());

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('encrypts and decrypts reencrypted message from dynamic config', async () => {
    // Setup mocks for `generateTDecEntities`
    const mockedUrsulas = mockUrsulas().slice(0, shares);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const [encrypter, decrypter, policy, tDecConfig] =
      await generateTDecEntities(
        threshold,
        shares,
        aliceProvider,
        label,
        startDate,
        endDate,
        'https://porter-ibex.nucypher.community',
        aliceSecretKey
      );

    expect(policy.label).toBe(label);
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
    expect(makeTreasureMapSpy).toHaveBeenCalled();

    const ownsBufficornNFT = new Conditions.ERC721Ownership({
      contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      parameters: [3591],
    });

    const conditions = new ConditionSet([ownsBufficornNFT]);
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
    const bobPlaintext = await decrypter.retrieveAndDecrypt(
      [encryptedMessageKit],
      conditionContext
    );

    expect(getUrsulasSpy2).toHaveBeenCalled();
    expect(retrieveCFragsSpy).toHaveBeenCalled();
    expect(bobPlaintext[0]).toEqual(plaintext);
  });

  it('encrypts and decrypts reencrypted message from json config', async () => {
    // Setup mocks for `generateTDecEntities`
    const mockedUrsulas = mockUrsulas().slice(0, shares);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const [encrypter, decrypter, policy, tDecConfig] =
      await generateTDecEntities(
        threshold,
        shares,
        aliceProvider,
        label,
        startDate,
        endDate,
        'https://porter-ibex.nucypher.community',
        aliceSecretKey
      );

    expect(policy.label).toBe(label);
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
    expect(makeTreasureMapSpy).toHaveBeenCalled();

    const ownsBufficornNFT = new Conditions.ERC721Ownership({
      contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      parameters: [3591],
    });

    const conditions = new ConditionSet([ownsBufficornNFT]);
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

    const [jsonEncrypter, jsonDecrypter] = await TDecEntitiesFromConfig(
      tDecConfig,
      'https://porter-ibex.nucypher.community'
    );

    const conditionContext = conditions.buildContext(bobProvider);
    const bobPlaintext = await jsonDecrypter.retrieveAndDecrypt(
      [encryptedMessageKit],
      conditionContext
    );

    expect(getUrsulasSpy2).toHaveBeenCalled();
    expect(retrieveCFragsSpy).toHaveBeenCalled();
    expect(bobPlaintext[0]).toEqual(plaintext);
  });
});
