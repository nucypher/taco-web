import { SecretKey } from '@nucypher/nucypher-core';

import {
  ConditionExpression,
  CustomContextParam,
} from '../../../../src/conditions';
import { ContractCondition } from '../../../../src/conditions/base';
import { USER_ADDRESS_PARAM } from '../../../../src/conditions/const';
import { fakeWeb3Provider } from '../../../utils';
import { testContractConditionObj, testFunctionAbi } from '../../testVariables';

describe('validation', () => {
  it('accepts on a valid schema', () => {
    const contract = new ContractCondition(testContractConditionObj);
    expect(contract.toObj()).toEqual({
      ...testContractConditionObj,
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
  const functionAbi = {
    inputs: [
      {
        name: '_owner',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        name: 'balance',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  };

  it('accepts standardContractType', () => {
    const conditionObj = {
      ...testContractConditionObj,
      standardContractType,
      functionAbi: undefined,
    };
    const contractCondition = new ContractCondition(conditionObj);
    expect(contractCondition.toObj()).toEqual({
      ...conditionObj,
    });
  });

  it('accepts functionAbi', () => {
    const conditionObj = {
      ...testContractConditionObj,
      functionAbi,
      standardContractType: undefined,
    };
    const contractCondition = new ContractCondition(conditionObj);
    expect(contractCondition.toObj()).toEqual({
      ...conditionObj,
    });
  });

  it('rejects both', () => {
    const conditionObj = {
      ...testContractConditionObj,
      standardContractType,
      functionAbi,
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
  const contractConditionObj = {
    ...testContractConditionObj,
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
  const contractCondition = new ContractCondition(contractConditionObj);
  const web3Provider = fakeWeb3Provider(SecretKey.random().toBEBytes());
  const conditionExpr = new ConditionExpression(contractCondition);
  const conditionContext = conditionExpr.buildContext(web3Provider);
  const myCustomParam = ':customParam';
  const customParams: Record<string, CustomContextParam> = {};
  customParams[myCustomParam] = 1234;

  it('accepts custom function abi', async () => {
    const asJson = await conditionContext
      .withCustomParams(customParams)
      .toJson();
    expect(asJson).toBeDefined();
    expect(asJson).toContain(USER_ADDRESS_PARAM);
    expect(asJson).toContain(myCustomParam);
  });
});
