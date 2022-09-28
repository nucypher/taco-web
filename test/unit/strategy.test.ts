import { SecretKey } from '@nucypher/nucypher-core';

import { Cohort } from '../../src/sdk/cohort';
import { Strategy } from '../../src/sdk/strategy';
import {
  mockEncryptTreasureMap,
  mockGenerateKFrags,
  mockGetUrsulas,
  mockMakeTreasureMap,
  mockPublishToBlockchain,
  mockUrsulas,
  mockWeb3Provider,
} from '../utils';

describe('Strategy', () => {
  const cohortConfig = {
    threshold: 2,
    shares: 3,
    porterUri: 'https://porter-ibex.nucypher.community',
  };
  const aliceSecretKey = SecretKey.random();
  const startDate = new Date(900000000000);
  const endDate = new Date(900000100000);
  const aliceProvider = mockWeb3Provider(aliceSecretKey.toSecretBytes());

  it('can create Strategy from configuration', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      startDate,
      endDate,
      undefined,
      aliceSecretKey
    );

    const expectedUrsulas = [
      '0x5cf1703a1c99a4b42eb056535840e93118177232',
      '0x7fff551249d223f723557a96a0e1a469c79cc934',
      '0x9c7c824239d3159327024459ad69bb215859bd25',
    ];
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(testStrategy.cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  it('can export to JSON', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      startDate,
      endDate,
      undefined,
      aliceSecretKey
    );

    const configJSON = testStrategy.toJSON();
    const expectedJSON =
      '{"cohort":{"ursulaAddresses":["0x5cf1703a1c99a4b42eb056535840e93118177232","0x7fff551249d223f723557a96a0e1a469c79cc934","0x9c7c824239d3159327024459ad69bb215859bd25"],"threshold":2,"shares":3,"porterUri":"https://porter-ibex.nucypher.community"},"startDate":"1998-07-09T16:00:00.000Z","endDate":"1998-07-09T16:01:40.000Z","aliceSecretKey":{"ptr":1179612},"bobSecretKey":{"ptr":1179084}}';
    expect(configJSON).toEqual(expectedJSON);
  });

  it('can import from JSON', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);

    const configJSON =
      '{"cohort":{"ursulaAddresses":["0x5cf1703a1c99a4b42eb056535840e93118177232","0x7fff551249d223f723557a96a0e1a469c79cc934","0x9c7c824239d3159327024459ad69bb215859bd25"],"threshold":2,"shares":3,"porterUri":"https://porter-ibex.nucypher.community"},"startDate":"1998-07-09T16:00:00.000Z","endDate":"1998-07-09T16:01:40.000Z","aliceSecretKey":{"ptr":1179612},"bobSecretKey":{"ptr":1179084}}';
    const testStrategy = Strategy.fromJSON(configJSON);
    const expectedUrsulas = [
      '0x5cf1703a1c99a4b42eb056535840e93118177232',
      '0x7fff551249d223f723557a96a0e1a469c79cc934',
      '0x9c7c824239d3159327024459ad69bb215859bd25',
    ];
    expect(testStrategy.cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  it('can deploy and return DeployedStrategy', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const generateKFragsSpy = mockGenerateKFrags();
    const publishToBlockchainSpy = mockPublishToBlockchain();
    const makeTreasureMapSpy = mockMakeTreasureMap();
    const encryptTreasureMapSpy = mockEncryptTreasureMap();

    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      new Date(),
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      undefined,
      aliceSecretKey
    );
    const testDeployed = await testStrategy.deploy('test', aliceProvider);
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(generateKFragsSpy).toHaveBeenCalled();
    expect(publishToBlockchainSpy).toHaveBeenCalled();
    expect(encryptTreasureMapSpy).toHaveBeenCalled();
    expect(makeTreasureMapSpy).toHaveBeenCalled();

    expect(testDeployed.label).toEqual('test');
  });
});
