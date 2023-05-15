import { EvmCondition } from '../../../../src/conditions/base';
import { testEvmConditionObj } from '../../testVariables';

describe('validation', () => {
  it('accepts on a valid schema', () => {
    const evm = new EvmCondition(testEvmConditionObj);
    expect(evm.toObj()).toEqual(testEvmConditionObj);
  });

  it('rejects an invalid schema', () => {
    const badEvmCondition = {
      ...testEvmConditionObj,
      // Intentionally removing `contractAddress`
      contractAddress: undefined,
    };
    const badEvm = new EvmCondition(badEvmCondition);
    expect(() => badEvm.toObj()).toThrow('"contractAddress" is required');
    const { error } = badEvm.validate(badEvmCondition);
    expect(error?.message).toEqual('"contractAddress" is required');
  });
});

describe('accepts either standardContractType or functionAbi but not both or none', () => {
  const standardContractType = 'ERC20';
  const functionAbi = { fake_function_abi: true };

  it('accepts standardContractType', () => {
    const conditionObj = {
      ...testEvmConditionObj,
      standardContractType,
      functionAbi: undefined,
    };
    const evmCondition = new EvmCondition(conditionObj);
    expect(evmCondition.toObj()).toEqual(conditionObj);
  });

  it('accepts functionAbi', () => {
    const conditionObj = {
      ...testEvmConditionObj,
      functionAbi,
      standardContractType: undefined,
    };
    const evmCondition = new EvmCondition(conditionObj);
    expect(evmCondition.toObj()).toEqual(conditionObj);
  });

  it('rejects both', () => {
    const conditionObj = {
      ...testEvmConditionObj,
      standardContractType,
      functionAbi,
    };
    const evmCondition = new EvmCondition(conditionObj);
    expect(() => evmCondition.toObj()).toThrow(
      '"value" contains a conflict between exclusive peers [standardContractType, functionAbi]'
    );
  });

  it('rejects none', () => {
    const conditionObj = {
      ...testEvmConditionObj,
      standardContractType: undefined,
      functionAbi: undefined,
    };
    const evmCondition = new EvmCondition(conditionObj);
    expect(() => evmCondition.toObj()).toThrow(
      '"value" must contain at least one of [standardContractType, functionAbi]'
    );
  });
});
