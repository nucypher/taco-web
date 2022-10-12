import { Cohort } from '../../src/sdk/cohort';
import { mockGetUrsulas, mockUrsulas } from '../utils';

describe('Cohort', () => {
  it('can create Cohort from configuration', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);

    const config = {
      threshold: 2,
      shares: 3,
      porterUri: 'https://_this.should.crash',
    };
    const testCohort = await Cohort.create(config);

    const expectedUrsulas = [
      '0x5cf1703a1c99a4b42eb056535840e93118177232',
      '0x7fff551249d223f723557a96a0e1a469c79cc934',
      '0x9c7c824239d3159327024459ad69bb215859bd25',
    ];
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(testCohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  it('can export to JSON', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const config = {
      threshold: 2,
      shares: 3,
      porterUri: 'https://_this.should.crash',
    };
    const testCohort = await Cohort.create(config);
    const configJSON = testCohort.toJSON();
    const expectedJSON =
      '{"ursulaAddresses":["0x5cf1703a1c99a4b42eb056535840e93118177232","0x7fff551249d223f723557a96a0e1a469c79cc934","0x9c7c824239d3159327024459ad69bb215859bd25"],"threshold":2,"shares":3,"porterUri":"https://_this.should.crash"}';
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(configJSON).toEqual(expectedJSON);
  });

  it('can import from JSON', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 3);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);

    const configJSON =
      '{"ursulaAddresses":["0x5cf1703a1c99a4b42eb056535840e93118177232","0x7fff551249d223f723557a96a0e1a469c79cc934","0x9c7c824239d3159327024459ad69bb215859bd25"],"threshold":2,"shares":3,"porterUri":"https://_this.should.crash"}';
    const testCohort = Cohort.fromJSON(configJSON);
    const expectedUrsulas = [
      '0x5cf1703a1c99a4b42eb056535840e93118177232',
      '0x7fff551249d223f723557a96a0e1a469c79cc934',
      '0x9c7c824239d3159327024459ad69bb215859bd25',
    ];
    const expectedConfiguration = {
      threshold: 2,
      shares: 3,
      porterUri: 'https://_this.should.crash',
    };
    expect(getUrsulasSpy).toHaveBeenCalled();
    expect(testCohort.ursulaAddresses).toEqual(expectedUrsulas);
    expect(testCohort.configuration).toEqual(expectedConfiguration);
  });
});
