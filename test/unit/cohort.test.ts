import { Cohort } from '../../src/sdk/cohort';

import { mockUrsulas, mockGetUrsulas } from '../utils';

describe('Cohort', () => {  
    test('should throw an error if created without shares or cohort', async () => {
      await expect(Cohort.create({
          porterUri: "test uri",
          threshold: 5
        })).rejects.toThrow('Shares is 0 and Include is an empty array');
    });

    it('blank test', () => {
      const mockedUrsulas = mockUrsulas().slice(0, 5);
    });

    it('can create Cohort from list of ursulas', async () => {
      const mockedUrsulas = mockUrsulas().slice(0, 5);
      const getUrsulasSpy = mockGetUrsulas(mockedUrsulas);
      const includeUrsulas = ["test string"];

      const testCohort = await Cohort.create({
        porterUri: 'https://porter-ibex.nucypher.community',
        threshold: 5,
        include: includeUrsulas
      });

      expect(getUrsulasSpy).toHaveBeenCalled();
    });
});
