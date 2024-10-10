import { describe, expect, it } from 'vitest';

import {
  IfThenElseCondition,
  ifThenElseConditionSchema,
  IfThenElseConditionType,
} from '../../src/conditions/if-then-else-condition';
import { TimeConditionType } from '../../src/conditions/schemas/time';
import {
  testCompoundConditionObj,
  testContractConditionObj,
  testRpcConditionObj,
  testSequentialConditionObj,
  testTimeConditionObj,
} from '../test-utils';

describe('validation', () => {
  it('infers default condition type from constructor', () => {
    const condition = new IfThenElseCondition({
      ifCondition: testRpcConditionObj,
      thenCondition: testTimeConditionObj,
      elseCondition: testContractConditionObj,
    });
    expect(condition.value.conditionType).toEqual(IfThenElseConditionType);
  });

  it('validates type', () => {
    const result = IfThenElseCondition.validate(ifThenElseConditionSchema, {
      conditionType: TimeConditionType,
      ifCondition: testRpcConditionObj,
      thenCondition: testTimeConditionObj,
      elseCondition: testContractConditionObj,
    });
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      conditionType: {
        _errors: [
          `Invalid literal value, expected "${IfThenElseConditionType}"`,
        ],
      },
    });
  });

  it('accepts recursive if-then-else conditions', () => {
    const nestedIfThenElseConditionObj = {
      conditionType: IfThenElseConditionType,
      ifCondition: testRpcConditionObj,
      thenCondition: testTimeConditionObj,
      elseCondition: testContractConditionObj,
    };

    const conditionObj = {
      conditionType: IfThenElseConditionType,
      ifCondition: testTimeConditionObj,
      thenCondition: nestedIfThenElseConditionObj,
      elseCondition: nestedIfThenElseConditionObj,
    };

    const result = IfThenElseCondition.validate(
      ifThenElseConditionSchema,
      conditionObj,
    );
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      conditionType: IfThenElseConditionType,
      ifCondition: testTimeConditionObj,
      thenCondition: nestedIfThenElseConditionObj,
      elseCondition: nestedIfThenElseConditionObj,
    });
  });

  it('accepts nested sequential and compound conditions', () => {
    const conditionObj = {
      conditionType: IfThenElseConditionType,
      ifCondition: testRpcConditionObj,
      thenCondition: testSequentialConditionObj,
      elseCondition: testCompoundConditionObj,
    };
    const result = IfThenElseCondition.validate(
      ifThenElseConditionSchema,
      conditionObj,
    );
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      conditionType: IfThenElseConditionType,
      ifCondition: testRpcConditionObj,
      thenCondition: testSequentialConditionObj,
      elseCondition: testCompoundConditionObj,
    });
  });

  it.each([true, false])(
    'accepts boolean for else condition',
    (booleanValue) => {
      const conditionObj = {
        conditionType: IfThenElseConditionType,
        ifCondition: testTimeConditionObj,
        thenCondition: testRpcConditionObj,
        elseCondition: booleanValue,
      };

      const result = IfThenElseCondition.validate(
        ifThenElseConditionSchema,
        conditionObj,
      );
      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({
        conditionType: IfThenElseConditionType,
        ifCondition: testTimeConditionObj,
        thenCondition: testRpcConditionObj,
        elseCondition: booleanValue,
      });
    },
  );

  it('limits max depth of nested if condition', () => {
    const result = IfThenElseCondition.validate(ifThenElseConditionSchema, {
      ifCondition: {
        conditionType: IfThenElseConditionType,
        ifCondition: testRpcConditionObj,
        thenCondition: testCompoundConditionObj,
        elseCondition: testTimeConditionObj,
      },
      thenCondition: testRpcConditionObj,
      elseCondition: testTimeConditionObj,
    });
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      ifCondition: {
        _errors: [`Exceeded max nested depth of 2 for multi-condition type`],
      },
    });
  });

  it('limits max depth of nested then condition', () => {
    const result = IfThenElseCondition.validate(ifThenElseConditionSchema, {
      ifCondition: testRpcConditionObj,
      thenCondition: {
        conditionType: IfThenElseConditionType,
        ifCondition: testRpcConditionObj,
        thenCondition: testCompoundConditionObj,
        elseCondition: true,
      },
      elseCondition: testTimeConditionObj,
    });
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      thenCondition: {
        _errors: [`Exceeded max nested depth of 2 for multi-condition type`],
      },
    });
  });

  it('limits max depth of nested else condition', () => {
    const result = IfThenElseCondition.validate(ifThenElseConditionSchema, {
      ifCondition: testRpcConditionObj,
      thenCondition: testTimeConditionObj,
      elseCondition: {
        conditionType: IfThenElseConditionType,
        ifCondition: testRpcConditionObj,
        thenCondition: testSequentialConditionObj,
        elseCondition: testTimeConditionObj,
      },
    });
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      elseCondition: {
        _errors: [`Exceeded max nested depth of 2 for multi-condition type`],
      },
    });
  });
});
