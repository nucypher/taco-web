import { Cohort } from '../../src/sdk/cohort';
import { mockGetUrsulas, mockUrsulas } from '../utils';

describe('Cohort', () => {
  it('should throw an error if created without shares or cohort', async () => {
    await expect(
      Cohort.create({
        porterUri: 'test uri',
        threshold: 5,
      })
    ).rejects.toThrow('Shares is 0 and Include is an empty array');
  });

  it('can create Cohort from list of ursulas', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 5);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const includeUrsulas = ['test string'];

    const testCohort = await Cohort.create({
      porterUri: 'https://porter-ibex.nucypher.community',
      threshold: 5,
      include: includeUrsulas,
    });

    expect(getUrsulasSpy).toHaveBeenCalled();
  });

  it('can export to JSON', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 5);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
    const includeUrsulas = ['test string'];

    const testCohort = await Cohort.create({
      porterUri: 'https://porter-ibex.nucypher.community',
      threshold: 5,
      include: includeUrsulas,
    });
    const config = testCohort.toJson();
    const expectedConfig = {
      ursulaAddresses: [
        '0x5cf1703a1c99a4b42eb056535840e93118177232',
        '0x7fff551249d223f723557a96a0e1a469c79cc934',
        '0x9c7c824239d3159327024459ad69bb215859bd25',
        '0x9919c9f5cbbaa42cb3bea153e14e16f85fea5b5d',
        '0xfbeb3368735b3f0a65d1f1e02bf1d188bb5f5be6',
      ],
      threshold: 5,
      porterUri: 'https://porter-ibex.nucypher.community',
    };
    expect(config).toEqual(expectedConfig);
  });

  it('can import from JSON', async () => {
    const mockedUrsulas = mockUrsulas().slice(0, 5);
    const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);

    const config = {
      ursulaAddresses: [
        '0x5cf1703a1c99a4b42eb056535840e93118177232',
        '0x7fff551249d223f723557a96a0e1a469c79cc934',
        '0x9c7c824239d3159327024459ad69bb215859bd25',
        '0x9919c9f5cbbaa42cb3bea153e14e16f85fea5b5d',
        '0xfbeb3368735b3f0a65d1f1e02bf1d188bb5f5be6',
      ],
      threshold: 5,
      porterUri: 'https://porter-ibex.nucypher.community',
    };

    const testCohort = Cohort.fromJson(config);
    expect(testCohort.ursulaAddresses).toEqual(config.ursulaAddresses);
    expect(testCohort.threshold).toEqual(config.threshold);
    expect(testCohort.porterUri).toEqual(config.porterUri);
  });
});
