import { initialize } from '@nucypher/shared';
import { fakeUrsulas } from '@nucypher/test-utils';
import { beforeAll, describe, expect, it } from 'vitest';

import { Cohort } from '../src';

import { makeCohort } from './utils';

describe('Cohort', () => {
  beforeAll(async () => {
    await initialize();
  });

  it('creates a Cohort', async () => {
    const ursulas = fakeUrsulas();
    const cohort = await makeCohort(ursulas);
    const expectedUrsulas = ursulas.map((u) => u.checksumAddress);
    expect(cohort.ursulaAddresses).toEqual(expectedUrsulas);
  });

  it('serializes to a plain object', async () => {
    const ursulas = fakeUrsulas();
    const cohort = await makeCohort(ursulas);
    const asObj = cohort.toObj();
    const fromObj = Cohort.fromObj(asObj);
    expect(fromObj).toEqual(cohort);
  });

  it('serializes to JSON', async () => {
    const ursulas = fakeUrsulas();
    const cohort = await makeCohort(ursulas);
    const asJson = cohort.toJSON();
    const fromJson = Cohort.fromJSON(asJson);
    expect(fromJson).toEqual(cohort);
  });
});
