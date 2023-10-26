import { describe, expect, it } from 'vitest';

import {
  CompoundCondition,
  CompoundConditionProps,
  ContractCondition,
  TimeCondition,
} from '../../src/conditions';
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
  it.each(['and', 'or'])('accepts "%s" operator', (operator) => {
    const conditionObj: CompoundConditionProps = {
      conditionType: CompoundConditionType,
      operator,
      operands: [testContractConditionObj, testTimeConditionObj],
    };
    const result = CompoundCondition.validate(compoundConditionSchema, conditionObj);

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

  const multichainCondition: CompoundConditionProps = {
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

  const condObjects = [testContractConditionObj, testTimeConditionObj];
  const conditions = [
    new ContractCondition(testContractConditionObj),
    new TimeCondition(testTimeConditionObj),
  ];
  const mixed = [
    new ContractCondition(testContractConditionObj),
    testTimeConditionObj,
  ];
  it.each([
    ['and', condObjects],
    ['and', conditions],
    ['and', mixed],
    ['or', condObjects],
    ['or', conditions],
    ['or', mixed],
  ])('accepts shorthand for "%s" operator', (operator, operands) => {
    const compoundCondition =
      'or' === operator
        ? CompoundCondition.or(operands)
        : CompoundCondition.and(operands);
    expect(compoundCondition.toObj()).toEqual({
      conditionType: CompoundConditionType,
      operator,
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
