import { initialize } from '@nucypher/nucypher-core';
import { AuthProvider, USER_ADDRESS_PARAM_DEFAULT } from '@nucypher/taco-auth';
import { fakeAuthProviders } from '@nucypher/test-utils';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  ContractCondition,
  ContractConditionProps,
  contractConditionSchema,
  ContractConditionType,
  FunctionAbiProps,
  humanReadableAbiSchema,
} from '../../../src/conditions/base/contract';
import { USER_ADDRESS_PARAMS } from '../../../src/conditions/const';
import {
  ConditionContext,
  CustomContextParam,
} from '../../../src/conditions/context';
import { testContractConditionObj, testFunctionAbi } from '../../test-utils';

describe('validation', () => {
  it('accepts on a valid schema', () => {
    const result = ContractCondition.validate(
      contractConditionSchema,
      testContractConditionObj,
    );

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(testContractConditionObj);
  });

  it('rejects an invalid schema', () => {
    const badContractCondition = {
      ...testContractConditionObj,
      // Intentionally removing `contractAddress`
      contractAddress: undefined,
    } as unknown as ContractConditionProps;
    const result = ContractCondition.validate(
      contractConditionSchema,
      badContractCondition,
    );

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      contractAddress: {
        _errors: ['Required'],
      },
    });
  });

  it('infers condition type from constructor', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { conditionType, ...withoutType } = testContractConditionObj;
    const condition = new ContractCondition(withoutType);
    expect(condition.value.conditionType).toEqual(ContractConditionType);
  });
});

describe('accepts either standardContractType or functionAbi but not both or none', () => {
  const standardContractType = 'ERC20';
  const functionAbi = {
    inputs: [
      {
        name: '_owner',
        type: 'address',
        internalType: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        name: 'balance',
        type: 'uint256',
        internalType: 'uint256',
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
    } as typeof testContractConditionObj;
    const result = ContractCondition.validate(
      contractConditionSchema,
      conditionObj,
    );

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(conditionObj);
  });

  it('accepts functionAbi', () => {
    const conditionObj = {
      ...testContractConditionObj,
      functionAbi,
      standardContractType: undefined,
    } as typeof testContractConditionObj;
    const result = ContractCondition.validate(
      contractConditionSchema,
      conditionObj,
    );

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(conditionObj);
  });

  it('rejects both', () => {
    const conditionObj = {
      ...testContractConditionObj,
      standardContractType,
      functionAbi,
    } as typeof testContractConditionObj;
    const result = ContractCondition.validate(
      contractConditionSchema,
      conditionObj,
    );

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      standardContractType: {
        _errors: [
          "At most one of the fields 'standardContractType' and 'functionAbi' must be defined",
        ],
      },
    });
  });

  it('rejects none', () => {
    const conditionObj = {
      ...testContractConditionObj,
      standardContractType: undefined,
      functionAbi: undefined,
    } as typeof testContractConditionObj;
    const result = ContractCondition.validate(
      contractConditionSchema,
      conditionObj,
    );

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      standardContractType: {
        _errors: [
          "At most one of the fields 'standardContractType' and 'functionAbi' must be defined",
        ],
      },
    });
  });
});

describe('supports various user address params', () => {
  it.each(USER_ADDRESS_PARAMS)(
    'handles different user address context params',
    (userAddressContextParam) => {
      const contractConditionObj: ContractConditionProps = {
        ...testContractConditionObj,
        parameters: [userAddressContextParam],
      };

      const result = ContractCondition.validate(
        contractConditionSchema,
        contractConditionObj,
      );

      expect(result.error).toBeUndefined();
    },
  );
});

describe('supports custom function abi', async () => {
  const contractConditionObj: ContractConditionProps = {
    ...testContractConditionObj,
    standardContractType: undefined,
    functionAbi: testFunctionAbi,
    method: 'myFunction',
    parameters: [USER_ADDRESS_PARAM_DEFAULT, ':customParam'],
    returnValueTest: {
      comparator: '==',
      value: 100,
    },
  };
  const contractCondition = new ContractCondition(contractConditionObj);
  const myCustomParam = ':customParam';
  const customParams: Record<string, CustomContextParam> = {};
  customParams[myCustomParam] = 1234;

  let authProviders: Record<string, AuthProvider>;
  beforeAll(async () => {
    await initialize();
    authProviders = await fakeAuthProviders();
  });

  it('accepts custom function abi with a custom parameter', async () => {
    const conditionContext = new ConditionContext(contractCondition);
    conditionContext.addCustomContextParameterValues(customParams);

    conditionContext.addAuthProvider(
      USER_ADDRESS_PARAM_DEFAULT,
      authProviders[USER_ADDRESS_PARAM_DEFAULT],
    );

    const asJson = await conditionContext.toJson();
    expect(asJson).toBeDefined();
    expect(asJson).toContain(USER_ADDRESS_PARAM_DEFAULT);
    expect(asJson).toContain(myCustomParam);
  });

  it.each([
    {
      method: 'balanceOf',
      functionAbi: {
        name: 'balanceOf',
        type: 'function',
        inputs: [{ name: '_owner', type: 'address', internalType: 'address' }],
        outputs: [
          { name: 'balance', type: 'uint256', internalType: 'uint256' },
        ],
        stateMutability: 'view',
      },
    },
    {
      method: 'get',
      functionAbi: {
        name: 'get',
        type: 'function',
        inputs: [],
        outputs: [
          { name: 'balance', type: 'uint256', internalType: 'uint256' },
        ],
        stateMutability: 'pure',
      },
    },
    {
      method: 'balanceOf',
      functionAbi: 'balanceOf(address _owner) view returns (uint256 balance)',
    },
  ])('accepts well-formed functionAbi', ({ method, functionAbi }) => {
    const result = ContractCondition.validate(contractConditionSchema, {
      ...contractConditionObj,
      parameters:
        typeof functionAbi === 'string'
          ? ['fake_parameter']
          : functionAbi.inputs.map((input) => `fake_parameter_${input}`),
      functionAbi: functionAbi as FunctionAbiProps | string,
      method,
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data?.method).toEqual(method);
    if (typeof functionAbi === 'string') {
      expect(typeof result.data?.functionAbi).toBe('object');
    } else {
      expect(result.data?.functionAbi).toEqual(functionAbi);
    }
  });

  it.each([
    {
      method: '1234',
      badField: 'name',
      expectedErrors: ['Expected string, received number'],
      functionAbi: {
        name: 1234, // invalid value
        type: 'function',
        inputs: [{ name: '_owner', type: 'address', internalType: 'address' }],
        outputs: [
          { name: 'balance', type: 'uint256', internalType: 'uint256' },
        ],
        stateMutability: 'view',
      },
    },
    {
      method: 'transfer',
      badField: 'inputs',
      expectedErrors: ['Expected array, received string'],
      functionAbi: {
        name: 'transfer',
        type: 'function',
        inputs: 'invalid value', // invalid value
        outputs: [{ name: '_status', type: 'bool', internalType: 'bool' }],
        stateMutability: 'pure',
      },
    },
    {
      method: 'get',
      badField: 'stateMutability',
      expectedErrors: [
        'Invalid literal value, expected "view"',
        'Invalid literal value, expected "pure"',
      ],
      functionAbi: {
        name: 'get',
        type: 'function',
        inputs: [],
        outputs: [{ name: 'result', type: 'uint256', internalType: 'uint256' }],
        stateMutability: 'invalid', // invalid value
      },
    },
    {
      method: 'test',
      badField: 'outputs',
      expectedErrors: ['Expected array, received string'],
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
      badField: 'inputs',
      expectedErrors: ['Required'],
      functionAbi: {
        name: 'calculatePow',
        type: 'function',
        // 'inputs': []   // Missing inputs array
        outputs: [{ name: 'result', type: 'uint256', internalType: 'uint256' }],
        stateMutability: 'view',
      },
    },
  ])(
    'rejects malformed functionAbi',
    ({ method, badField, expectedErrors, functionAbi }) => {
      const result = ContractCondition.validate(contractConditionSchema, {
        ...contractConditionObj,
        functionAbi: functionAbi as unknown as FunctionAbiProps,
        method,
      });

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        functionAbi: {
          [badField]: {
            _errors: expectedErrors,
          },
        },
      });
    },
  );

  it('rejects malformed human-readable functionAbi', () => {
    const result = ContractCondition.validate(contractConditionSchema, {
      ...contractConditionObj,
      functionAbi: 'invalid human-readable ABI',
      method: 'invalidMethod',
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      functionAbi: {
        _errors: ['Invalid Human-Readable ABI format'],
      },
    });
  });

  it('converts human-readable ABI to JSON ABI format', () => {
    const humanReadableAbi =
      'balanceOf(address _owner) view returns (uint256 balance)';
    const condition = new ContractCondition({
      ...contractConditionObj,
      functionAbi: humanReadableAbi,
      method: 'balanceOf',
    });
    const invalidHumanReadableAbi = 'function invalidAbi';

    expect(() => humanReadableAbiSchema.parse(humanReadableAbi)).not.toThrow();
    expect(() => humanReadableAbiSchema.parse(invalidHumanReadableAbi)).toThrow(
      'Invalid Human-Readable ABI format',
    );
    expect(condition.value.functionAbi).toEqual({
      name: 'balanceOf',
      type: 'function',
      inputs: [{ name: '_owner', type: 'address', internalType: 'address' }],
      outputs: [{ name: 'balance', type: 'uint256', internalType: 'uint256' }],
      stateMutability: 'view',
    });
  });

  it.each([
    {
      contractAddress: '0x123',
      error: ['Invalid', 'String must contain exactly 42 character(s)'],
    },
    { contractAddress: undefined, error: ['Required'] },
  ])('rejects invalid contract address', async ({ contractAddress, error }) => {
    const result = ContractCondition.validate(contractConditionSchema, {
      ...testContractConditionObj,
      contractAddress,
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      contractAddress: {
        _errors: error,
      },
    });
  });
});
