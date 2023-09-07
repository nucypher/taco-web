import { Condition } from '../../../src/conditions';
import { CompoundCondition } from '../../../src/conditions/base';
import {
  compoundConditionSchema,
  CompoundConditionType,
} from '../../../src/conditions/compound-condition';
import {
  testContractConditionObj,
  testRpcConditionObj,
  testTimeConditionObj,
} from '../testVariables';

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
});
