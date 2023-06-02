import { Cohort } from '../../src';
import { fakeUrsulas, makeCohort } from '../utils';

describe('Cohort', () => {
  const mockedUrsulas = fakeUrsulas().slice(0, 3);

  it('creates a Cohort', async () => {
    const cohort = await makeCohort(mockedUrsulas);
    const expectedUrsulas = mockedUrsulas.map((u) => u.checksumAddress);
    expect(cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  it('serializes to a plain object', async () => {
    const cohort = await makeCohort(mockedUrsulas);
    const asObj = cohort.toObj();
    const fromObj = Cohort.fromObj(asObj);
    expect(fromObj).toEqual(cohort);
  });

  it('serializes to JSON', async () => {
    const cohort = await makeCohort(mockedUrsulas);
    const asJson = cohort.toJSON();
    const fromJson = Cohort.fromJSON(asJson);
    expect(fromJson).toEqual(cohort);
  });
});
