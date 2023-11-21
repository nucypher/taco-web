import { TEST_CONTRACT_ADDR } from '@nucypher/test-utils';
import { describe, expect, it } from 'vitest';

import {
  Condition,
  ContractCondition,
  ERC721Ownership,
} from '../../../src/conditions';
import { fakeCondition, testContractConditionObj } from '../../test-utils';

describe('validation', () => {
  const condition = fakeCondition();

  it('accepts a correct schema', async () => {
    const result = Condition.validate(condition.schema, condition.value);
    expect(result.error).toBeUndefined();
    expect(result.data.contractAddress).toEqual(TEST_CONTRACT_ADDR);
  });

  it('rejects an incorrect schema', async () => {
    const result = Condition.validate(condition.schema, {
      ...condition.value,
      contractAddress: '0x123',
    });
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      contractAddress: {
        _errors: ['Invalid', 'String must contain exactly 42 character(s)'],
      },
    });
  });

  it('rejects non-integer chain', () => {
    const badObj = {
      ...condition.value,
      chain: 'not-an-integer',
    };
    const result = Condition.validate(condition.schema, badObj);

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      chain: {
        _errors: [
          'Invalid literal value, expected 137',
          'Invalid literal value, expected 80001',
          'Invalid literal value, expected 5',
          'Invalid literal value, expected 11155111',
          'Invalid literal value, expected 1',
        ],
      },
    });
  });
});

describe('serialization', () => {
  it('serializes to a plain object', () => {
    const contract = new ContractCondition(testContractConditionObj);
    expect(contract.toObj()).toEqual({
      ...testContractConditionObj,
    });
  });

  it('serializes predefined conditions', () => {
    const contract = new ERC721Ownership(testContractConditionObj);
    expect(contract.toObj()).toEqual({
      ...testContractConditionObj,
    });
  });
});
