import { VerifiedKeyFrag } from '@nucypher/nucypher-core';
import { providers } from 'ethers';

import {
  Cohort,
  Conditions,
  ConditionSet,
  SecretKey,
  Strategy,
} from '../../src';
import { Ursula } from '../../src/characters/porter';
import { toBytes } from '../../src/utils';
import {
  mockDetectEthereumProvider,
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockGetUrsulas,
  mockMakeTreasureMap,
  mockPublishToBlockchain,
  mockRetrieveCFragsRequest,
  mockUrsulas,
  mockWeb3Provider,
} from '../utils';

describe('Get Started (CBD PoC)', () => {
  beforeAll(() => {
    jest
      .spyOn(providers, 'Web3Provider')
      .mockImplementation(() =>
        mockWeb3Provider(SecretKey.random().toSecretBytes())
      );
  });

  afterAll(() => {
    jest.unmock('ethers');
  });

  it('can run the get started example', async () => {
    const mockedUrsulas = mockUrsulas();
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();
    const detectEthereumProvider = mockDetectEthereumProvider();

    // Start of 2. Build a Cohort
    const config = {
      threshold: 3,
      shares: 5,
      porterUri: 'https://porter-tapir.nucypher.community',
    };
    const newCohort = await Cohort.create(config);
    // End of 2. Build a Cohort

    const expectedAddresses = mockedUrsulas.map((u) => u.checksumAddress);
    expect(newCohort.ursulaAddresses).toEqual(expectedAddresses);
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(newCohort.configuration).toEqual(config);

    // Start of 3. Specify default Conditions
    const NFTOwnership = new Conditions.ERC721Ownership({
      contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
      chain: 5, // Tapir network uses Görli testnet
      parameters: [5954],
    });

    const conditions = new ConditionSet([
      NFTOwnership,
      // Other conditions can be added here
    ]);
    // End of 3. Specify default Conditions

    const condObj = conditions.conditions[0].toObj();
    expect(condObj).toEqual(NFTOwnership.toObj());
    expect(condObj.parameters).toEqual([5954]);
    expect(condObj.chain).toEqual(5);
    expect(condObj.contractAddress).toEqual(
      '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D'
    );
    expect(conditions.validate()).toEqual(true);

    // Start of 4. Build a Strategy
    const newStrategy = Strategy.create(newCohort, conditions);

    const MMprovider = await detectEthereumProvider();
    const mumbai = providers.getNetwork(80001);

    if (MMprovider) {
      const web3Provider = new providers.Web3Provider(MMprovider, mumbai);
      const newDeployed = await newStrategy.deploy('test', web3Provider);
      // End of 4. Build a Strategy

      expect(publishToBlockchainSpy).toHaveBeenCalled();
      expect(newDeployed.label).toEqual('test');

      // Start of 5. Encrypt the plaintext & update Conditions
      const NFTBalanceConfig = {
        contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
        standardContractType: 'ERC721',
        chain: 5,
        method: 'balanceOf',
        parameters: [':userAddress'],
        returnValueTest: {
          comparator: '>=',
          value: 3,
        },
      };
      const NFTBalance = new Conditions.Condition(NFTBalanceConfig);

      const encrypter = newDeployed.encrypter;

      const plaintext = 'this is a secret';
      const encryptedMessageKit = encrypter.encryptMessage(
        plaintext,
        new ConditionSet([NFTBalance])
      );
      // End of 5. Encrypt the plaintext & update Conditions

      expect(getUrsulasSpy).toHaveBeenCalledTimes(2);
      expect(generateKFragsSpy).toHaveBeenCalled();
      expect(encryptTreasureMapSpy).toHaveBeenCalled();
      expect(makeTreasureMapSpy).toHaveBeenCalled();

      // Setup mocks for `retrieveAndDecrypt`
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

      // Start of 6. Request decryption rights
      const decrypter = newDeployed.decrypter;

      const conditionContext = conditions.buildContext(web3Provider);
      const decryptedMessage = await decrypter.retrieveAndDecrypt(
        [encryptedMessageKit],
        conditionContext
      );
      // End of 6. Request decryption rights

      expect(retrieveCFragsSpy).toHaveBeenCalled();
      expect(decryptedMessage[0]).toEqual(toBytes(plaintext));
    }
  });
});
