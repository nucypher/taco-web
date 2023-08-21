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
  const condition = new ERC721Balance({
    contractAddress: TEST_CONTRACT_ADDR,
    chain: TEST_CHAIN_ID,
  });

  it('accepts a correct schema', async () => {
    const result = condition.validate();
    expect(result.error).toBeUndefined();
    expect(result.data.contractAddress).toEqual(TEST_CONTRACT_ADDR);
  });

  it('accepts on a valid value override', async () => {
    const validOverride = {
      chain: TEST_CHAIN_ID,
      contractAddress: TEST_CONTRACT_ADDR_2,
    };
    const result = condition.validate(validOverride);
    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject(validOverride);
  });

  it('rejects on an invalid value override', async () => {
    const invalidOverride = {
      chain: -1,
      contractAddress: TEST_CONTRACT_ADDR,
    };
    const result = condition.validate(invalidOverride);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      chain: {
        _errors: [
          'Invalid literal value, expected 137',
          'Invalid literal value, expected 80001',
          'Invalid literal value, expected 5',
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
