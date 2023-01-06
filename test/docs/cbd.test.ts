import { providers } from 'ethers';

import {
  Cohort,
  Conditions,
  ConditionSet,
  SecretKey,
  Strategy,
} from '../../src';
import { mockGetUrsulas, mockUrsulas, mockWeb3Provider } from '../utils';

describe('Get Started (CBD PoC)', () => {
  it('2. Build a Cohort', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);

    const expectedUrsulas = [
      '0x5cf1703a1c99a4b42eb056535840e93118177232',
      '0x7fff551249d223f723557a96a0e1a469c79cc934',
      '0x9c7c824239d3159327024459ad69bb215859bd25',
    ];

    // Start of example code
    const config = {
      threshold: 3,
      shares: 5,
      porterUri: 'https://porter-tapir.nucypher.community',
    };
    const newCohort = await Cohort.create(config);
    // End of example code

    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(newCohort.ursulaAddresses).toEqual(expectedUrsulas);
    expect(newCohort.configuration).toEqual(config);
  });

  it('3. Specify default Conditions', () => {
    // Start of example code
    const NFTOwnership = new Conditions.ERC721Ownership({
      contractAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
      chain: 5, // Tapir network uses Görli testnet
      parameters: [5954],
    });

    const conditions = new ConditionSet([
      NFTOwnership,
      // Other conditions can be added here
    ]);
    // End of example code

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

    const newStrategy = Strategy.create(newCohort, conditions);

    // TODO: We want to mock the Web3Provider constructor in the ethers library
    // We want to use our existing mockWeb3Provider function

    // const ethers = {
    //   providers: {
    //     Web3Provider: () =>
    //       mockWeb3Provider(SecretKey.random().toSecretBytes()),
    //   } as unknown as { new (): providers.Web3Provider },
    // };

    const detectEthereumProvider = jest.fn(async () => {
      return {} as unknown as providers.ExternalProvider;
    });

    // TODO: How do we mock the Web3Provider?
    // Specifically, how do we mock the constructor? In Jest
    // providers.Web3Provider =
    //   mockWeb3Provider(SecretKey.random().toSecretBytes());

    const getWeb3Provider = (_ethProvider: any, _mumbai: any) =>
      mockWeb3Provider(SecretKey.random().toSecretBytes());

    const ethProvider = await detectEthereumProvider();
    const mumbai = providers.getNetwork(80001);

    if (ethProvider) {
      const web3Provider = getWeb3Provider(ethProvider, mumbai);
      const newDeployed = await newStrategy.deploy('test', web3Provider);
      console.log(newDeployed);
    }

    const expectedUrsulas = [
      '0x5cf1703a1c99a4b42eb056535840e93118177232',
      '0x7fff551249d223f723557a96a0e1a469c79cc934',
      '0x9c7c824239d3159327024459ad69bb215859bd25',
    ];

    expect(newStrategy.cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });
});
