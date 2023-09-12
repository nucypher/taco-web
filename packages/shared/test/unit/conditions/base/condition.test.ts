import { expect, test } from 'vitest';

import { Condition } from '../../../../src';
import { ContractCondition } from '../../../../src/conditions/base';
import {
  ERC721Balance,
  ERC721Ownership,
} from '../../../../src/conditions/predefined';
import {
  TEST_CHAIN_ID,
  TEST_CONTRACT_ADDR,
  testContractConditionObj,
} from '../../testVariables';

test('validation', () => {
  const condition = new ERC721Balance({
    contractAddress: TEST_CONTRACT_ADDR,
    chain: TEST_CHAIN_ID,
  });

  test('accepts a correct schema', async () => {
    const result = Condition.validate(condition.schema, condition.value);
    expect(result.error).toBeUndefined();
    expect(result.data.contractAddress).toEqual(TEST_CONTRACT_ADDR);
  });
});

test('serialization', () => {
  test('serializes to a plain object', () => {
    const contract = new ContractCondition(testContractConditionObj);
    expect(contract.toObj()).toEqual({
      ...testContractConditionObj,
    });
  });

  test('serializes predefined conditions', () => {
    const contract = new ERC721Ownership(testContractConditionObj);
    expect(contract.toObj()).toEqual({
      ...testContractConditionObj,
    });
  });
});
