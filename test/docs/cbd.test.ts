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
  const setup = async () => {
    const detectEthereumProvider = mockDetectEthereumProvider();
    const mockedUrsulas = mockUrsulas();
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    jest
      .spyOn(providers, 'Web3Provider')
      .mockImplementation(() =>
        mockWeb3Provider(SecretKey.random().toSecretBytes())
      );

    // Start of 2. Build a Cohort
    const config = {
      threshold: 3,
      shares: 5,
      porterUri: 'https://porter-tapir.nucypher.community',
    };
    const newCohort = await Cohort.create(config);

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

    // Start of 4. Build a Strategy
    const newStrategy = Strategy.create(newCohort, conditions);

    const MMprovider = await detectEthereumProvider();
    const mumbai = providers.getNetwork(80001);

    const web3Provider = new providers.Web3Provider(MMprovider, mumbai);
    const newDeployed = await newStrategy.deploy('test', web3Provider);

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

    jest.unmock('ethers');

    return {
      newCohort,
      conditions,
      newDeployed,
      decryptedMessage,
      getUrsulasSpy,
      generateKFragsSpy,
      encryptTreasureMapSpy,
      makeTreasureMapSpy,
      publishToBlockchainSpy,
      retrieveCFragsSpy,
    };
  };

  it('can run the get started example', async () => {
    const getStarted = await setup();

    const plaintext = 'this is a secret';
    const expectedAddresses = mockUrsulas().map((u) => u.checksumAddress);
    const condObj = getStarted.conditions.conditions[0].toObj();
    expect(getStarted.newCohort.ursulaAddresses).toEqual(expectedAddresses);
    expect(condObj.parameters).toEqual([5954]);
    expect(condObj.chain).toEqual(5);
    expect(condObj.contractAddress).toEqual(
      '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D'
    );
    expect(getStarted.conditions.validate()).toEqual(true);
    expect(getStarted.publishToBlockchainSpy).toHaveBeenCalled();
    expect(getStarted.newDeployed.label).toEqual('test');
    expect(getStarted.getUrsulasSpy).toHaveBeenCalledTimes(2);
    expect(getStarted.generateKFragsSpy).toHaveBeenCalled();
    expect(getStarted.encryptTreasureMapSpy).toHaveBeenCalled();
    expect(getStarted.makeTreasureMapSpy).toHaveBeenCalled();
    expect(getStarted.retrieveCFragsSpy).toHaveBeenCalled();
    expect(getStarted.decryptedMessage[0]).toEqual(toBytes(plaintext));
  });
});
