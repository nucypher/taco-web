import { SecretKey } from '@nucypher/nucypher-core';

import { CustomContextParam } from '../../../../build/main/src';
import { ConditionContext, ConditionSet } from '../../../../src/conditions';
import { ContractCondition } from '../../../../src/conditions/base';
import { USER_ADDRESS_PARAM } from '../../../../src/conditions/const';
import { fakeWeb3Provider } from '../../../utils';
import { testContractConditionObj, testFunctionAbi } from '../../testVariables';

describe('validation', () => {
  it('accepts on a valid schema', () => {
    const contract = new ContractCondition(testContractConditionObj);
    expect(contract.toObj()).toEqual({
      ...testContractConditionObj,
      _class: 'ContractCondition',
    });
  });

  it('rejects an invalid schema', () => {
    const badContractCondition = {
      ...testContractConditionObj,
      // Intentionally removing `contractAddress`
      contractAddress: undefined,
    };
    const badEvm = new ContractCondition(badContractCondition);
    expect(() => badEvm.toObj()).toThrow(
      'Invalid condition: "contractAddress" is required'
    );

    const { error } = badEvm.validate(badContractCondition);
    expect(error?.message).toEqual('"contractAddress" is required');
  });
});

describe('accepts either standardContractType or functionAbi but not both or none', () => {
  const standardContractType = 'ERC20';

  it('accepts standardContractType', () => {
    const conditionObj = {
      ...testContractConditionObj,
      standardContractType,
      functionAbi: undefined,
    };
    const contractCondition = new ContractCondition(conditionObj);
    expect(contractCondition.toObj()).toEqual({
      ...conditionObj,
      _class: 'ContractCondition',
    });
  });

  it('accepts functionAbi', () => {
    const conditionObj = {
      ...testContractConditionObj,
      functionAbi: testFunctionAbi,
      method: testFunctionAbi.name,
      parameters: ['0x1234', 1234],
      standardContractType: undefined,
    };
    const contractCondition = new ContractCondition(conditionObj);
    expect(contractCondition.toObj()).toEqual({
      ...conditionObj,
      _class: 'ContractCondition',
    });
  });

  it('rejects both', () => {
    const conditionObj = {
      ...testContractConditionObj,
      standardContractType,
      parameters: ['0x1234', 1234],
      functionAbi: testFunctionAbi,
      method: testFunctionAbi.name,
    };
    const contractCondition = new ContractCondition(conditionObj);
    expect(() => contractCondition.toObj()).toThrow(
      '"value" contains a conflict between exclusive peers [standardContractType, functionAbi]'
    );
  });

  it('rejects none', () => {
    const conditionObj = {
      ...testContractConditionObj,
      standardContractType: undefined,
      functionAbi: undefined,
    };
    const contractCondition = new ContractCondition(conditionObj);
    expect(() => contractCondition.toObj()).toThrow(
      '"value" must contain at least one of [standardContractType, functionAbi]'
    );
  });
});

describe('supports custom function abi', () => {
  const evmConditionObj = {
    ...testEvmConditionObj,
    standardContractType: undefined,
    functionAbi: testFunctionAbi,
    method: 'myFunction',
    parameters: [USER_ADDRESS_PARAM, ':customParam'],
    returnValueTest: {
      index: 0,
      comparator: '==',
      value: USER_ADDRESS_PARAM,
    },
  };
  const evmCondition = new EvmCondition(evmConditionObj);
  const web3Provider = fakeWeb3Provider(SecretKey.random().toBEBytes());
  const conditionSet = new ConditionSet([evmCondition]);
  const conditionContext = new ConditionContext(
    conditionSet.toWASMConditions(),
    web3Provider
  );
  const myCustomParam = ':customParam';
  const customParams: Record<string, CustomContextParam> = {};
  customParams[myCustomParam] = 1234;

  it('accepts a custom param in function abi method params', async () => {
    const asJson = await conditionContext
      .withCustomParams(customParams)
      .toJson();
    expect(asJson).toBeDefined();
    expect(asJson).toContain(USER_ADDRESS_PARAM);
    expect(asJson).toContain(myCustomParam);
  });

  it('rejects on functionAbi mismatch', async () => {
    const badEvmConditionObj = {
      ...evmConditionObj,
      functionAbi: { bad_function_abi: 'bad_function_abi' },
    };
    const evmCondition = new EvmCondition(badEvmConditionObj);
    expect(() => evmCondition.toObj()).toThrow(
      'Invalid condition: "functionAbi.name" is required'
    );
  });

  it('rejects on functionAbi mismatch', async () => {
    const badEvmConditionObj = {
      ...evmConditionObj,
      method: 'badMethod',
    };
    const evmCondition = new EvmCondition(badEvmConditionObj);
    expect(() => evmCondition.toObj()).toThrow(
      'Invalid condition: "method" must be the same as "functionAbi.name"'
    );
  });

  it('rejects on functionAbi mismatch', async () => {
    const badEvmConditionObj = {
      ...evmConditionObj,
      parameters: [],
    };
    const evmCondition = new EvmCondition(badEvmConditionObj);
    expect(() => evmCondition.toObj()).toThrow(
      'Invalid condition: "parameters" must have the same length as "functionAbi.inputs"'
    );
  });
});
