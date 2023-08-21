import { CompoundCondition } from '../../../src/conditions/base';
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
    const result = new CompoundCondition(conditionObj).validate();

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      ...conditionObj,
      conditionType: 'compound',
    });
  });

  it('accepts and operator', () => {
    const conditionObj = {
      operator: 'and',
      operands: [testContractConditionObj, testTimeConditionObj],
    };
    const result = new CompoundCondition(conditionObj).validate();

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      ...conditionObj,
      conditionType: 'compound',
    });
  });

  it('rejects an invalid operator', () => {
    const result = new CompoundCondition({
      operator: 'not-an-operator',
      operands: [testRpcConditionObj, testTimeConditionObj],
    }).validate();

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
    const result = new CompoundCondition({
      operator: 'or',
      operands: [],
    }).validate();

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      operands: {
        _errors: ['Array must contain at least 2 element(s)'],
      },
    });
  });

  it('rejects invalid number of operands = 1', () => {
    const result = new CompoundCondition({
      operator: 'or',
      operands: [testRpcConditionObj],
    }).validate();
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
    const result = new CompoundCondition(conditionObj).validate();
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      conditionType: 'compound',
      operator: 'and',
      operands: [
        testContractConditionObj,
        testTimeConditionObj,
        testRpcConditionObj,
        {
          conditionType: 'compound',
          operator: 'or',
          operands: [testTimeConditionObj, testContractConditionObj],
        },
      ],
    });
  });
});
