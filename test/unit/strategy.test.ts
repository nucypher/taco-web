import { Cohort } from '../../src/sdk/cohort';
import {
  DeployedStrategy,
  RevokedStrategy,
  Strategy,
} from '../../src/sdk/strategy';
import { mockGetUrsulas, mockUrsulas } from '../utils';

describe('Strategy', () => {
  it('can create Strategy from configuration', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);

    const cohortConfig = {
      threshold: 2,
      shares: 3,
      porterUri: 'https://porter-ibex.nucypher.community',
    };
    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      new Date(),
      new Date(Date.now() + 60 * 1000)
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
    const cohortConfig = {
      threshold: 2,
      shares: 3,
      porterUri: 'https://porter-ibex.nucypher.community',
    };
    const testCohort = await Cohort.create(cohortConfig);
    const testStrategy = Strategy.create(
      testCohort,
      new Date(500000000000),
      new Date(500000010000)
    );
    const configJSON = testStrategy.toJSON();
    console.log(configJSON);
    const expectedJSON =
      '{"cohort":{"ursulaAddresses":["0x5cf1703a1c99a4b42eb056535840e93118177232","0x7fff551249d223f723557a96a0e1a469c79cc934","0x9c7c824239d3159327024459ad69bb215859bd25"],"threshold":2,"shares":3,"porterUri":"https://porter-ibex.nucypher.community"},"startDate":"1985-11-05T00:53:20.000Z","endDate":"1985-11-05T00:53:30.000Z","aliceSecretKey":{"ptr":1179084},"bobSecretKey":{"ptr":1179040}}';
    expect(configJSON).toEqual(expectedJSON);
  });

  it('can import from JSON', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);

    const configJSON =
      '{"cohort":{"ursulaAddresses":["0x5cf1703a1c99a4b42eb056535840e93118177232","0x7fff551249d223f723557a96a0e1a469c79cc934","0x9c7c824239d3159327024459ad69bb215859bd25"],"threshold":2,"shares":3,"porterUri":"https://porter-ibex.nucypher.community"},"startDate":"1985-11-05T00:53:20.000Z","endDate":"1985-11-05T00:53:30.000Z","aliceSecretKey":{"ptr":1179084},"bobSecretKey":{"ptr":1179040}}';
    const testStrategy = Strategy.fromJSON(configJSON);
    const expectedUrsulas = [
      '0x5cf1703a1c99a4b42eb056535840e93118177232',
      '0x7fff551249d223f723557a96a0e1a469c79cc934',
      '0x9c7c824239d3159327024459ad69bb215859bd25',
    ];
    expect(testStrategy.cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });
});
