import { providers } from 'ethers';

import {
  Cohort,
  Conditions,
  ConditionSet,
  SecretKey,
  Strategy,
} from '../../src';
import {
  mockGetUrsulas,
  mockPublishToBlockchain,
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

  it('2. Build a Cohort', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);

    // Start of the code example
    const config = {
      threshold: 3,
      shares: 5,
      porterUri: 'https://porter-tapir.nucypher.community',
    };
    const newCohort = await Cohort.create(config);
    // End of the example code

    expect(getUrsulasSpy).toHaveBeenCalled();
    const expectedAddresses = mockedUrsulas.map((u) => u.checksumAddress);
    expect(newCohort.ursulaAddresses).toEqual(expectedAddresses);
    expect(newCohort.configuration).toEqual(config);
  });

  it('3. Specify default Conditions', () => {
    // Start of the code example
    const NFTOwnership = new Conditions.ERC721Ownership({
      contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
      chain: 5, // Tapir network uses Görli testnet
      parameters: [5954],
    });

    const conditions = new ConditionSet([
      NFTOwnership,
      // Other conditions can be added here
    ]);
    // End of the example code

    const condObj = conditions.conditions[0].toObj();
    expect(conditions.validate()).toEqual(true);
    expect(condObj).toEqual(NFTOwnership.toObj());
    expect(condObj.parameters).toEqual([5954]);
    expect(condObj.chain).toEqual(5);
    expect(condObj.contractAddress).toEqual(
      '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D'
    );
  });

  it('4. Build a Strategy', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    mockGetUrsulas(mockedUrsulas);
    const publishToBlockchainSpy = mockPublishToBlockchain();

    const cohortConfig = {
      threshold: 2,
      shares: 3,
      porterUri: 'https://_this.should.crash',
    };
    const newCohort = await Cohort.create(cohortConfig);

    const NFTOwnership = new Conditions.ERC721Ownership({
      contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
      chain: 5, // Tapir network uses Görli testnet
      parameters: [5954],
    });

    const conditions = new ConditionSet([NFTOwnership]);

    const strategy = Strategy.create(newCohort, conditions);

    const detectEthereumProvider = jest.fn(async () => {
      return {} as unknown as providers.ExternalProvider;
    });

    const ethProvider = await detectEthereumProvider();
    const mumbai = providers.getNetwork(80001);

    if (ethProvider) {
      const web3Provider = new providers.Web3Provider(ethProvider, mumbai);
      const deployedStrategy = await strategy.deploy('test', web3Provider);
      console.log(deployedStrategy);
    }

    // End of the code example
    const expectedAddresses = mockedUrsulas.map((u) => u.checksumAddress);
    expect(newCohort.ursulaAddresses).toEqual(expectedAddresses);
    expect(publishToBlockchainSpy).toHaveBeenCalled();
  });
});
