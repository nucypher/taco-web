import { describe, expect, it } from 'vitest';

import {
  SIGNING_CONDITION_OBJECT_CONTEXT_VAR,
  SigningObjectAttributeCondition,
  signingObjectAttributeConditionSchema,
  SigningObjectAttributeConditionType,
} from '../../../src/conditions/base/signing';
import { testSigningAttributeConditionObj } from '../../test-utils';

describe('SigningObjectAttributeCondition', () => {
  describe('validation', () => {
    it('accepts on a valid schema', () => {
      const result = SigningObjectAttributeCondition.validate(
        signingObjectAttributeConditionSchema,
        testSigningAttributeConditionObj,
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testSigningAttributeConditionObj);
    });

    describe('rejects an invalid schema', () => {
      it('rejects invalid condition type', () => {
        const badSigningAttributeConditionObj = {
          ...testSigningAttributeConditionObj,
          conditionType: 'myAttribute',
        };
        const result = SigningObjectAttributeCondition.validate(
          signingObjectAttributeConditionSchema,
          badSigningAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error?.format()).toMatchObject({
          conditionType: {
            _errors: ['Invalid literal value, expected "attribute"'],
          },
        });
      });
      it('rejects invalid context variable', () => {
        const badSigningAttributeConditionObj = {
          ...testSigningAttributeConditionObj,
          signingObjectContextVar: ':contextVar',
        };
        const result = SigningObjectAttributeCondition.validate(
          signingObjectAttributeConditionSchema,
          badSigningAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error?.format()).toMatchObject({
          signingObjectContextVar: {
            _errors: [
              'Invalid literal value, expected ":signingConditionObject"',
            ],
          },
        });
      });
      it('rejects empty attributeName', () => {
        const badSigningAttributeConditionObj = {
          ...testSigningAttributeConditionObj,
          // Intentionally replacing `attributeName` with an invalid value
          attributeName: '',
        };

        const result = SigningObjectAttributeCondition.validate(
          signingObjectAttributeConditionSchema,
          badSigningAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error?.format()).toMatchObject({
          attributeName: {
            _errors: ['String must contain at least 1 character(s)'],
          },
        });
      });
      it('rejects invalid attributeName value type', () => {
        const badSigningAttributeConditionObj = {
          ...testSigningAttributeConditionObj,
          // Intentionally replacing `attributeName` with an invalid value
          attributeName: 100,
        };

        const result = SigningObjectAttributeCondition.validate(
          signingObjectAttributeConditionSchema,
          badSigningAttributeConditionObj,
        );
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error?.format()).toMatchObject({
          attributeName: {
            _errors: ['Expected string, received number'],
          },
        });
      });
    });

    it('infers condition type from constructor', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { conditionType, ...withoutType } =
        testSigningAttributeConditionObj;
      const condition = new SigningObjectAttributeCondition(withoutType);
      expect(condition.value.conditionType).toEqual(
        SigningObjectAttributeConditionType,
      );
    });
    it('infers context variable from constructor', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { conditionType, signingObjectContextVar, ...withoutType } =
        testSigningAttributeConditionObj;
      const condition = new SigningObjectAttributeCondition(withoutType);
      expect(condition.value.signingObjectContextVar).toEqual(
        SIGNING_CONDITION_OBJECT_CONTEXT_VAR,
      );
    });
  });
});
