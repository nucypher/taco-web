import { describe, expect, it } from 'vitest';

import { CompoundCondition, Condition } from '../../src/conditions';
import {
  compoundConditionSchema,
  CompoundConditionType,
} from '../../src/conditions/compound-condition';
import {
  testContractConditionObj,
  testRpcConditionObj,
  testTimeConditionObj,
} from '../test-utils';

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
      conditionType: CompoundConditionType,
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
      conditionType: CompoundConditionType,
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
    conditionType: CompoundConditionType,
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

  it('accepts shorthand for "or" operator', () => {
    const compoundCondition = CompoundCondition.or([
      testContractConditionObj,
      testTimeConditionObj,
    ]);
    expect(compoundCondition.toObj()).toEqual({
      conditionType: CompoundConditionType,
      operator: 'or',
      operands: [testContractConditionObj, testTimeConditionObj],
    });
  });

  it('accepts shorthand for "and" operator', () => {
    const compoundCondition = CompoundCondition.and([
      testContractConditionObj,
      testTimeConditionObj,
    ]);
    expect(compoundCondition.toObj()).toEqual({
      conditionType: CompoundConditionType,
      operator: 'and',
      operands: [testContractConditionObj, testTimeConditionObj],
    });
  });

  it('infers condition type from constructor', () => {
    const condition = new CompoundCondition({
      operator: 'and',
      operands: [testContractConditionObj, testTimeConditionObj],
    });
    expect(condition.value.conditionType).toEqual(CompoundConditionType);
  });
});
