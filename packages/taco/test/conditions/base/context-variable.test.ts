import { describe, expect, it } from 'vitest';

import {
  ContextVariableCondition,
  ContextVariableConditionProps,
} from '../../../src/conditions/base/context-variable';
import {
  contextVariableConditionSchema,
  ContextVariableConditionType,
} from '../../../src/conditions/schemas/context-variable';
import { testContextVariableConditionObj } from '../../test-utils';

describe('ContextVariableCondition', () => {
  describe('validate', () => {
    it('accepts valid condition object', () => {
      const result = ContextVariableCondition.validate(
        contextVariableConditionSchema,
        testContextVariableConditionObj,
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testContextVariableConditionObj);
    });

    it('fills in conditionType if missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { conditionType: _, ...withoutType } =
        testContextVariableConditionObj;
      const condition = new ContextVariableCondition(withoutType);

      expect(condition.toObj().conditionType).toBe(
        ContextVariableConditionType,
      );
    });

    it('rejects unknown fields', () => {
      const conditionObj = {
        ...testContextVariableConditionObj,
        unknownField: 'unknown',
      } as unknown as ContextVariableConditionProps;

      const result = ContextVariableCondition.validate(
        contextVariableConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        _errors: ["Unrecognized key(s) in object: 'unknownField'"],
      });
    });

    it('requires contextVariable to be present', () => {
      const conditionObj = {
        ...testContextVariableConditionObj,
        contextVariable: undefined,
      } as unknown as ContextVariableConditionProps;

      const result = ContextVariableCondition.validate(
        contextVariableConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toHaveProperty('contextVariable');
    });

    it('requires contextVariable to be a valid context parameter', () => {
      const conditionObj = {
        ...testContextVariableConditionObj,
        contextVariable: 'invalidParam',
      } as unknown as ContextVariableConditionProps;

      const result = ContextVariableCondition.validate(
        contextVariableConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.message).toContain('Invalid');
    });

    it.each([':userAddress', ':customParam', ':myVariable'])(
      'accepts valid context parameters: %s',
      (param) => {
        const conditionObj = {
          ...testContextVariableConditionObj,
          contextVariable: param,
        };

        const result = ContextVariableCondition.validate(
          contextVariableConditionSchema,
          conditionObj,
        );

        expect(result.error).toBeUndefined();
        expect(result.data?.contextVariable).toBe(param);
      },
    );

    it('requires returnValueTest to be present', () => {
      const conditionObj = {
        ...testContextVariableConditionObj,
        returnValueTest: undefined,
      } as unknown as ContextVariableConditionProps;

      const result = ContextVariableCondition.validate(
        contextVariableConditionSchema,
        conditionObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toHaveProperty('returnValueTest');
    });
  });

  describe('constructor', () => {
    it('creates a condition from a valid object', () => {
      const condition = new ContextVariableCondition(
        testContextVariableConditionObj,
      );
      expect(condition.toObj()).toEqual(testContextVariableConditionObj);
    });

    it('throws an error for invalid condition', () => {
      const invalidCondition = () => {
        return new ContextVariableCondition({
          contextVariable: ':userAddress',
          returnValueTest: {
            comparator: 'in',
            value: [], // empty array should fail
          },
        });
      };

      expect(invalidCondition).toThrow(/Invalid condition/);
    });
  });

  describe('requiresAuthentication', () => {
    it('returns true when contextVariable references user authentication', () => {
      const condition = new ContextVariableCondition({
        contextVariable: ':userAddress',
        returnValueTest: {
          comparator: 'in',
          value: ['0x1234567890123456789012345678901234567890'],
        },
      });
      expect(condition.requiresAuthentication()).toBe(true);
    });

    it('returns false when contextVariable does not reference user authentication', () => {
      const condition = new ContextVariableCondition({
        contextVariable: ':customParam',
        returnValueTest: {
          comparator: '==',
          value: 'someValue',
        },
      });
      expect(condition.requiresAuthentication()).toBe(false);
    });
  });

  describe('equals', () => {
    it('returns true for identical conditions', () => {
      const condition1 = new ContextVariableCondition(
        testContextVariableConditionObj,
      );
      const condition2 = new ContextVariableCondition(
        testContextVariableConditionObj,
      );
      expect(condition1.equals(condition2)).toBe(true);
    });

    it('returns false for different conditions', () => {
      const condition1 = new ContextVariableCondition(
        testContextVariableConditionObj,
      );
      const condition2 = new ContextVariableCondition({
        ...testContextVariableConditionObj,
        returnValueTest: {
          comparator: '==',
          value: 'different-value',
        },
      });
      expect(condition1.equals(condition2)).toBe(false);
    });
  });
});
