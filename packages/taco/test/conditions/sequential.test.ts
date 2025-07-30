import { ChainId } from '@nucypher/shared';
import { describe, expect, it } from 'vitest';

import { CompoundConditionType } from '../../src/conditions/compound-condition';
import { IfThenElseConditionType } from '../../src/conditions/if-then-else-condition';
import {
  ConditionVariableProps,
  SequentialCondition,
  SequentialConditionProps,
  sequentialConditionSchema,
  SequentialConditionType,
} from '../../src/conditions/sequential';
import {
  testCompoundConditionObj,
  testContractConditionObj,
  testJsonApiConditionObj,
  testRpcConditionObj,
  testTimeConditionObj,
} from '../test-utils';

describe('validation', () => {
  const rpcConditionVariable: ConditionVariableProps = {
    varName: 'rpc',
    condition: testRpcConditionObj,
  };
  const timeConditionVariable: ConditionVariableProps = {
    varName: 'time',
    condition: testTimeConditionObj,
  };
  const contractConditionVariable: ConditionVariableProps = {
    varName: 'contract',
    condition: testContractConditionObj,
  };
  const compoundConditionVariable: ConditionVariableProps = {
    varName: 'compound',
    condition: testCompoundConditionObj,
  };
  const nestedSequentialConditionVariable: ConditionVariableProps = {
    varName: 'nestedSequential',
    condition: {
      conditionType: SequentialConditionType,
      conditionVariables: [
        {
          varName: 'nestedRpc',
          condition: testRpcConditionObj,
        },
        {
          varName: 'nestedTime',
          condition: testTimeConditionObj,
        },
        {
          varName: 'nestedContract',
          condition: testContractConditionObj,
        },
      ],
    },
  };

  it('rejects no varName', () => {
    const result = SequentialCondition.validate(sequentialConditionSchema, {
      conditionVariables: [
        rpcConditionVariable,
        {
          condition: testTimeConditionObj,
        },
      ],
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      conditionVariables: {
        '1': {
          varName: {
            _errors: ['Required'],
          },
        },
      },
    });
  });

  it('rejects duplication variable names', () => {
    const result = SequentialCondition.validate(sequentialConditionSchema, {
      conditionVariables: [
        {
          varName: 'var1',
          condition: testRpcConditionObj,
        },
        {
          varName: 'var2',
          condition: testTimeConditionObj,
        },
        {
          varName: 'var1',
          condition: testContractConditionObj,
        },
      ],
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      conditionVariables: {
        _errors: ['Duplicate variable names are not allowed'],
      },
    });
  });

  it('rejects > max number of condition variables', () => {
    const tooManyConditionVariables = new Array(6);
    for (let i = 0; i < tooManyConditionVariables.length; i++) {
      tooManyConditionVariables[i] = {
        varName: `var${i}`,
        condition: testRpcConditionObj,
      };
    }
    const result = SequentialCondition.validate(sequentialConditionSchema, {
      conditionVariables: tooManyConditionVariables,
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      conditionVariables: {
        _errors: ['Array must contain at most 5 element(s)'],
      },
    });
  });

  it('accepts nested compound conditions', () => {
    const conditionObj = {
      conditionType: SequentialConditionType,
      conditionVariables: [
        rpcConditionVariable,
        timeConditionVariable,
        contractConditionVariable,
        compoundConditionVariable,
      ],
    };
    const result = SequentialCondition.validate(
      sequentialConditionSchema,
      conditionObj,
    );
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      conditionType: SequentialConditionType,
      conditionVariables: [
        rpcConditionVariable,
        timeConditionVariable,
        contractConditionVariable,
        compoundConditionVariable,
      ],
    });
  });
  it('rejects nested sequential with duplicate varname', () => {
    const conditionObj = {
      conditionType: SequentialConditionType,
      conditionVariables: [
        rpcConditionVariable,
        timeConditionVariable,
        contractConditionVariable,
        {
          varName: 'nestedSequential',
          condition: {
            conditionType: SequentialConditionType,
            conditionVariables: [
              contractConditionVariable,
              {
                varName: 'nestedTime',
                condition: testTimeConditionObj,
              },
            ],
          },
        },
      ],
    };
    const result = SequentialCondition.validate(
      sequentialConditionSchema,
      conditionObj,
    );
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      conditionVariables: {
        _errors: ['Duplicate variable names are not allowed'],
      },
    });
  });
  it.each([true, false, testJsonApiConditionObj])(
    'rejects nested sequential with duplicate varname within nested if-then-else',
    (variedElseCondition) => {
      const conditionObj = {
        conditionType: SequentialConditionType,
        conditionVariables: [
          {
            varName: 'ifThenElse',
            condition: {
              conditionType: IfThenElseConditionType,
              ifCondition: testRpcConditionObj,
              thenCondition: testTimeConditionObj,
              elseCondition: variedElseCondition,
            },
          },
          contractConditionVariable,
          {
            varName: 'nestedSequential',
            condition: {
              conditionType: SequentialConditionType,
              conditionVariables: [
                contractConditionVariable,
                {
                  varName: 'nestedTime',
                  condition: testTimeConditionObj,
                },
              ],
            },
          },
        ],
      };
      const result = SequentialCondition.validate(
        sequentialConditionSchema,
        conditionObj,
      );
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        conditionVariables: {
          _errors: ['Duplicate variable names are not allowed'],
        },
      });
    },
  );
  it('accepts nested sequential and compound conditions', () => {
    const conditionObj = {
      conditionType: SequentialConditionType,
      conditionVariables: [
        rpcConditionVariable,
        timeConditionVariable,
        contractConditionVariable,
        compoundConditionVariable,
        nestedSequentialConditionVariable,
      ],
    };
    const result = SequentialCondition.validate(
      sequentialConditionSchema,
      conditionObj,
    );
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      conditionType: SequentialConditionType,
      conditionVariables: [
        rpcConditionVariable,
        timeConditionVariable,
        contractConditionVariable,
        compoundConditionVariable,
        nestedSequentialConditionVariable,
      ],
    });
  });

  it('limits max depth of nested compound condition', () => {
    const result = SequentialCondition.validate(sequentialConditionSchema, {
      conditionVariables: [
        rpcConditionVariable,
        contractConditionVariable,
        {
          varName: 'compound',
          condition: {
            conditionType: CompoundConditionType,
            operator: 'not',
            operands: [
              {
                conditionType: CompoundConditionType,
                operator: 'and',
                operands: [testTimeConditionObj, testRpcConditionObj],
              },
            ],
          },
        },
      ],
    });
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      conditionVariables: {
        _errors: [`Exceeded max nested depth of 2 for multi-condition type`],
      },
    });
  });

  it('limits max depth of nested sequential condition', () => {
    const result = SequentialCondition.validate(sequentialConditionSchema, {
      conditionVariables: [
        rpcConditionVariable,
        contractConditionVariable,
        {
          varName: 'sequentialNested',
          condition: {
            conditionType: SequentialConditionType,
            conditionVariables: [
              timeConditionVariable,
              nestedSequentialConditionVariable,
            ],
          },
        },
      ],
    });
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      conditionVariables: {
        _errors: ['Exceeded max nested depth of 2 for multi-condition type'],
      },
    });
  });

  it('accepts on a valid multichain condition schema', () => {
    const multichainCondition: SequentialConditionProps = {
      conditionType: SequentialConditionType,
      conditionVariables: [
        ChainId.AMOY,
        ChainId.POLYGON,
        ChainId.ETHEREUM_MAINNET,
        ChainId.SEPOLIA,
      ].map((chain) => ({
        varName: `chain_${chain}`,
        condition: {
          ...testRpcConditionObj,
          chain,
        },
      })),
    };

    const result = SequentialCondition.validate(
      sequentialConditionSchema,
      multichainCondition,
    );

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(multichainCondition);
  });

  it('rejects an invalid multichain condition schema', () => {
    const badMultichainCondition: SequentialConditionProps = {
      conditionType: SequentialConditionType,
      conditionVariables: [
        {
          varName: 'chain_1',
          condition: {
            ...testRpcConditionObj,
            chain: 1,
          },
        },
        {
          varName: 'chain_137',
          condition: {
            ...testRpcConditionObj,
            chain: 137,
          },
        },
        {
          varName: `invalid_chain`,
          condition: {
            ...testRpcConditionObj,
            chain: -1,
          },
        },
      ],
    };

    const result = SequentialCondition.validate(
      sequentialConditionSchema,
      badMultichainCondition,
    );

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it('infers default condition type from constructor', () => {
    const condition = new SequentialCondition({
      conditionVariables: [
        contractConditionVariable,
        timeConditionVariable,
        rpcConditionVariable,
      ],
    });
    expect(condition.value.conditionType).toEqual(SequentialConditionType);
  });
});
