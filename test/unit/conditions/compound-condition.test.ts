import { CompoundCondition } from '../../../src/conditions';
import {
  testContractConditionObj,
  testRpcConditionObj,
  testTimeConditionObj,
} from '../testVariables';

describe('validate', () => {
  it('accepts or operator', () => {
    const orCondition = new CompoundCondition({
      operator: 'or',
      operands: [testRpcConditionObj, testTimeConditionObj],
    }).toObj();

    expect(orCondition.operator).toEqual('or');
    expect(orCondition.operands).toEqual([
      testRpcConditionObj,
      testTimeConditionObj,
    ]);
  });

  it('accepts and operator', () => {
    const orCondition = new CompoundCondition({
      operator: 'and',
      operands: [testContractConditionObj, testTimeConditionObj],
    }).toObj();

    expect(orCondition.operator).toEqual('and');
    expect(orCondition.operands).toEqual([
      testContractConditionObj,
      testTimeConditionObj,
    ]);
  });

  it('rejects an invalid operator', () => {
    expect(() =>
      new CompoundCondition({
        operator: 'not-an-operator',
        operands: [testRpcConditionObj, testTimeConditionObj],
      }).toObj()
    ).toThrow('"operator" must be one of [and, or]');
  });

  it('rejects invalid number of operands = 0', () => {
    expect(() =>
      new CompoundCondition({
        operator: 'or',
        operands: [],
      }).toObj()
    ).toThrow('"operands" must contain at least 2 items');
  });

  it('rejects invalid number of operands = 1', () => {
    expect(() =>
      new CompoundCondition({
        operator: 'or',
        operands: [testRpcConditionObj],
      }).toObj()
    ).toThrow('"operands" must contain at least 2 items');
  });

  it('it allows recursive compound conditions', () => {
    const compoundCondition = new CompoundCondition({
      operator: 'and',
      operands: [
        testContractConditionObj,
        testTimeConditionObj,
        testRpcConditionObj,
        {
          operator: 'or',
          operands: [testRpcConditionObj, testTimeConditionObj],
        },
      ],
    }).toObj();
    expect(compoundCondition.operator).toEqual('and');
    expect(compoundCondition.operands).toHaveLength(4);
  });
});
