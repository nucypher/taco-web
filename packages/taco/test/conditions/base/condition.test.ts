import { TEST_CHAIN_ID, TEST_CONTRACT_ADDR } from '@nucypher/test-utils';
import { describe, expect, it } from 'vitest';

import {
  Condition,
  ContractCondition,
  ERC721Balance,
  ERC721Ownership,
} from '../../../src/conditions';
import { testContractConditionObj } from '../../test-utils';

describe('validation', () => {
  const condition = new ERC721Balance({
    contractAddress: TEST_CONTRACT_ADDR,
    chain: TEST_CHAIN_ID,
  });

  it('accepts a correct schema', async () => {
    const result = Condition.validate(condition.schema, condition.value);
    expect(result.error).toBeUndefined();
    expect(result.data.contractAddress).toEqual(TEST_CONTRACT_ADDR);
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
