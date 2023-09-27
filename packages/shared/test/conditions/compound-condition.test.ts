import {
  testContractConditionObj,
  testRpcConditionObj,
  testTimeConditionObj,
} from '@nucypher/test-utils';
import { describe, expect, it } from 'vitest';

import { CompoundCondition, Condition } from '../../src';
import {
  compoundConditionSchema,
  CompoundConditionType,
} from '../../src/conditions/compound-condition';

describe('validation', () => {
  it('accepts or operator', () => {
    const conditionObj = {
      operator: 'or',
      operands: [testContractConditionObj, testTimeConditionObj],
    };
    const result = Condition.validate(compoundConditionSchema, conditionObj);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      ...conditionObj,
      conditionType: CompoundConditionType,
    });
  });

  it('accepts and operator', () => {
    const conditionObj = {
      operator: 'and',
      operands: [testContractConditionObj, testTimeConditionObj],
    };
    const result = CompoundCondition.validate(
      compoundConditionSchema,
      conditionObj,
    );

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      ...conditionObj,
      conditionType: CompoundConditionType,
    });
  });

  it('rejects an invalid operator', () => {
    const result = CompoundCondition.validate(compoundConditionSchema, {
      operator: 'not-an-operator',
      operands: [testRpcConditionObj, testTimeConditionObj],
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      operator: {
        _errors: [
          "Invalid enum value. Expected 'and' | 'or', received 'not-an-operator'",
        ],
      },
    });
  });

  it('rejects invalid number of operands = 0', () => {
    const result = CompoundCondition.validate(compoundConditionSchema, {
      operator: 'or',
      operands: [],
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      operands: {
        _errors: ['Array must contain at least 2 element(s)'],
      },
    });
  });

  it('rejects invalid number of operands = 1', () => {
    const result = CompoundCondition.validate(compoundConditionSchema, {
      operator: 'or',
      operands: [testRpcConditionObj],
    });
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      operands: {
        _errors: ['Array must contain at least 2 element(s)'],
      },
    });
  });

  it('accepts recursive compound conditions', () => {
    const conditionObj = {
      operator: 'and',
      operands: [
        testContractConditionObj,
        testTimeConditionObj,
        testRpcConditionObj,
        {
          operator: 'or',
          operands: [testTimeConditionObj, testContractConditionObj],
        },
      ],
    };
    const result = CompoundCondition.validate(
      compoundConditionSchema,
      conditionObj,
    );
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      conditionType: CompoundConditionType,
      operator: 'and',
      operands: [
        testContractConditionObj,
        testTimeConditionObj,
        testRpcConditionObj,
        {
          conditionType: CompoundConditionType,
          operator: 'or',
          operands: [testTimeConditionObj, testContractConditionObj],
        },
      ],
    });
  });

  const multichainCondition = {
    conditionType: 'compound',
    operator: 'and',
    operands: [1, 137, 5, 80001].map((chain) => ({
      ...testRpcConditionObj,
      chain,
    })),
  };

  it('accepts on a valid multichain condition schema', () => {
    const result = CompoundCondition.validate(
      compoundConditionSchema,
      multichainCondition,
    );

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(multichainCondition);
  });

  it('rejects an invalid multichain condition schema', () => {
    const badMultichainCondition = {
      ...multichainCondition,
      operands: [
        ...multichainCondition.operands,
        {
          // Bad condition
          ...testRpcConditionObj,
          chain: -1,
        },
      ],
    };

    const result = CompoundCondition.validate(
      compoundConditionSchema,
      badMultichainCondition,
    );

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });
});
