import { ContractCondition } from '../../../../src/conditions/base';
import {
  ERC721Balance,
  ERC721Ownership,
} from '../../../../src/conditions/predefined';
import {
  TEST_CHAIN_ID,
  TEST_CONTRACT_ADDR,
  TEST_CONTRACT_ADDR_2,
  testContractConditionObj,
} from '../../testVariables';

describe('validation', () => {
  // TODO: Consider:
  //   Use Condition here with returnTestValue schema
  //   Refactor returnTestValue to be the part of the Condition
  const condition = new ERC721Balance();

  it('accepts a correct schema', async () => {
    const result = condition.validate({
      contractAddress: TEST_CONTRACT_ADDR,
      chain: TEST_CHAIN_ID,
    });
    expect(result.error).toBeUndefined();
    expect(result.value.contractAddress).toEqual(TEST_CONTRACT_ADDR);
  });

  it('updates on a valid schema value', async () => {
    const result = condition.validate({
      chain: TEST_CHAIN_ID,
      contractAddress: TEST_CONTRACT_ADDR_2,
    });
    expect(result.error).toBeUndefined();
    expect(result.value.chain).toEqual(TEST_CHAIN_ID);
  });

  it('rejects on an invalid schema value', async () => {
    const result = condition.validate({
      chain: -1,
      contractAddress: TEST_CONTRACT_ADDR,
    });
    expect(result.error?.message).toEqual(
      '"chain" must be one of [1, 5, 137, 80001]'
    );
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
      ...contract.defaults,
      ...testContractConditionObj,
    });
  });
});
