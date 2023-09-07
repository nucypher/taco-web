import { MessageKit, VerifiedKeyFrag } from '@nucypher/nucypher-core';
import { providers } from 'ethers';

import {
  Cohort,
  conditions,
  getPorterUri,
  PreStrategy,
  SecretKey,
} from '../../src';
import {
  ContractCondition,
  ContractConditionProps,
} from '../../src/conditions/base';
import { Ursula } from '../../src/porter';
import { toBytes } from '../../src/utils';
import {
  fakeProvider,
  fakeUrsulas,
  mockDetectEthereumProvider,
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockGetUrsulas,
  mockMakeTreasureMap,
  mockPublishToBlockchain,
  mockRetrieveCFragsRequest,
} from '../utils';

const {
  predefined: { ERC721Ownership },
  ConditionExpression,
} = conditions;

describe('Get Started (CBD PoC)', () => {
  function mockRetrieveAndDecrypt(
    makeTreasureMapSpy: jest.SpyInstance,
    encryptedMessageKit: MessageKit,
  ) {
    // Setup mocks for `retrieveAndDecrypt`
    const ursulaAddresses = (
      makeTreasureMapSpy.mock.calls[0][0] as readonly Ursula[]
    ).map((u) => u.checksumAddress);
    const verifiedKFrags = makeTreasureMapSpy.mock
      .calls[0][1] as readonly VerifiedKeyFrag[];
    return mockRetrieveCFragsRequest(
      ursulaAddresses,
      verifiedKFrags,
      encryptedMessageKit.capsule,
    );
  }

  it('can run the get started example', async () => {
    const detectEthereumProvider = mockDetectEthereumProvider();
    const mockedUrsulas = fakeUrsulas();
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    jest
      .spyOn(providers, 'Web3Provider')
      .mockImplementation(() => fakeProvider(SecretKey.random().toBEBytes()));

    //
    // Start of the code example
    //

    // 2. Build a Cohort
    const porterUri = getPorterUri('tapir');
    const numUrsulas = 5;
    const newCohort = await Cohort.create(porterUri, numUrsulas);

    // 3. Specify default conditions
    const NFTOwnership = new ERC721Ownership({
      contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
      chain: 5, // Tapir network uses Görli testnet
      parameters: [5954],
    });

    const conditions = new ConditionExpression(
      NFTOwnership,
      // Other conditions can be added here
    );

    // 4. Build a Strategy
    const newStrategy = PreStrategy.create(newCohort);

    const MMprovider = await detectEthereumProvider();
    const mumbai = providers.getNetwork(80001);

    const provider = new providers.Web3Provider(MMprovider, mumbai);
    const signer = provider.getSigner();
    const newDeployed = await newStrategy.deploy(provider, signer, 'test');

    // 5. Encrypt the plaintext & update conditions
    const NFTBalanceConfig: ContractConditionProps = {
      conditionType: 'contract',
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
    const NFTBalance = new ContractCondition(NFTBalanceConfig);
    const newConditions = new ConditionExpression(NFTBalance);
    const plaintext = 'this is a secret';
    const encrypter = newDeployed.makeEncrypter(newConditions);
    const encryptedMessageKit = encrypter.encryptMessagePre(plaintext);

    // Mocking - Not a part of any code example
    const retrieveCFragsSpy = mockRetrieveAndDecrypt(
      makeTreasureMapSpy,
      encryptedMessageKit,
    );

    // 6. Request decryption rights
    const decryptedMessage = await newDeployed.decrypter.retrieveAndDecrypt(
      provider,
      signer,
      [encryptedMessageKit],
    );

    //
    // End of the code example
    //

    const expectedAddresses = fakeUrsulas().map((u) => u.checksumAddress);
    const condObj = conditions.condition.toObj();
    expect(newCohort.ursulaAddresses).toEqual(expectedAddresses);
    expect(condObj.parameters).toEqual([5954]);
    expect(condObj.chain).toEqual(5);
    expect(condObj.contractAddress).toEqual(
      '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
    );
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(getUrsulasSpy).toHaveBeenCalledTimes(2);
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
    expect(makeTreasureMapSpy).toHaveBeenCalled();
    expect(retrieveCFragsSpy).toHaveBeenCalled();
    expect(decryptedMessage[0]).toEqual(toBytes(plaintext));
  });
});
