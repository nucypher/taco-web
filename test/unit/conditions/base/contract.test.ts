import {
  ConditionExpression,
  CustomContextParam,
} from '../../../../src/conditions';
import { ContractCondition } from '../../../../src/conditions/base';
import { USER_ADDRESS_PARAM } from '../../../../src/conditions/const';
import { fakeProvider, fakeSigner } from '../../../utils';
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
  const provider = fakeProvider();
  const signer = fakeSigner();
  const conditionExpr = new ConditionExpression(contractCondition);
  const conditionContext = conditionExpr.buildContext(provider, signer);
  const myCustomParam = ':customParam';
  const customParams: Record<string, CustomContextParam> = {};
  customParams[myCustomParam] = 1234;

  it('accepts custom function abi with a custom parameter', async () => {
    const asJson = await conditionContext
      .withCustomParams(customParams)
      .toJson();
    expect(asJson).toBeDefined();
    expect(asJson).toContain(USER_ADDRESS_PARAM);
    expect(asJson).toContain(myCustomParam);
  });

  it.each([
    {
      method: 'balanceOf',
      functionAbi: {
        name: 'balanceOf',
        type: 'function',
        inputs: [{ name: '_owner', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
        stateMutability: 'view',
      },
    },
    {
      method: 'get',
      functionAbi: {
        name: 'get',
        type: 'function',
        inputs: [],
        outputs: [],
        stateMutability: 'pure',
      },
    },
  ])('accepts well-formed functionAbi', ({ method, functionAbi }) => {
    expect(() =>
      new ContractCondition({
        ...contractConditionObj,
        parameters: functionAbi.inputs.map(
          (input) => `fake_parameter_${input}`
        ), //
        functionAbi,
        method,
      }).toObj()
    ).not.toThrow();
  });

  it.each([
    {
      method: '1234',
      expectedError: '"functionAbi.name" must be a string',
      functionAbi: {
        name: 1234, // invalid value
        type: 'function',
        inputs: [{ name: '_owner', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
        stateMutability: 'view',
      },
    },
    {
      method: 'transfer',
      expectedError: '"functionAbi.inputs" must be an array',
      functionAbi: {
        name: 'transfer',
        type: 'function',
        inputs: 'invalid value', // invalid value
        outputs: [{ name: '_status', type: 'bool' }],
        stateMutability: 'pure',
      },
    },
    {
      method: 'get',
      expectedError:
        '"functionAbi.stateMutability" must be one of [view, pure]',
      functionAbi: {
        name: 'get',
        type: 'function',
        inputs: [],
        outputs: [],
        stateMutability: 'invalid', // invalid value
      },
    },
    {
      method: 'test',
      expectedError: '"functionAbi.outputs" must be an array',
      functionAbi: {
        name: 'test',
        type: 'function',
        inputs: [],
        outputs: 'invalid value', // Invalid value
        stateMutability: 'pure',
      },
    },
    {
      method: 'calculatePow',
      expectedError:
        'Invalid condition: "parameters" must have the same length as "functionAbi.inputs"',
      functionAbi: {
        name: 'calculatePow',
        type: 'function',
        // 'inputs': []   // Missing inputs array
        outputs: [{ name: 'result', type: 'uint256' }],
        stateMutability: 'view',
      },
    },
  ])(
    'rejects malformed functionAbi',
    ({ method, expectedError, functionAbi }) => {
      expect(() =>
        new ContractCondition({
          ...contractConditionObj,
          functionAbi,
          method,
        }).toObj()
      ).toThrow(expectedError);
    }
  );
});
