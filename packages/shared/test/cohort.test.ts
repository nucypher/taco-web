import { fakeUrsulas, makeCohort } from '@nucypher/test-utils';
import { beforeAll, expect, test } from 'vitest';

import { Cohort, initialize } from '../src';

test('Cohort', () => {
  beforeAll(async () => {
    await initialize();
  });

  test('creates a Cohort', async () => {
    const ursulas = fakeUrsulas();
    const cohort = await makeCohort(ursulas);
    const expectedUrsulas = ursulas.map((u) => u.checksumAddress);
    expect(cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  test('serializes to a plain object', async () => {
    const ursulas = fakeUrsulas();
    const cohort = await makeCohort(ursulas);
    const asObj = cohort.toObj();
    const fromObj = Cohort.fromObj(asObj);
    expect(fromObj).toEqual(cohort);
  });

  test('serializes to JSON', async () => {
    const ursulas = fakeUrsulas();
    const cohort = await makeCohort(ursulas);
    const asJson = cohort.toJSON();
    const fromJson = Cohort.fromJSON(asJson);
    expect(fromJson).toEqual(cohort);
  });
});
