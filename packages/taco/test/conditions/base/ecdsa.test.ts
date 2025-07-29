import { describe, expect, it } from 'vitest';

import {
  ECDSACondition,
  ecdsaConditionSchema,
  ECDSAConditionType,
  SUPPORTED_ECDSA_CURVES,
} from '../../../src/conditions/base/ecdsa';
import { testECDSAConditionObj } from '../../test-utils';

describe('ECDSACondition', () => {
  describe('validation', () => {
    it('accepts a valid schema', () => {
      const result = ECDSACondition.validate(
        ecdsaConditionSchema,
        testECDSAConditionObj,
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testECDSAConditionObj);
    });

    it('rejects invalid message that is not a string or context variable', () => {
      const badECDSAObj = {
        ...testECDSAConditionObj,
        message: 123,
      };

      const result = ECDSACondition.validate(ecdsaConditionSchema, badECDSAObj);

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        message: {
          _errors: expect.arrayContaining(['Expected string, received number']),
        },
      });
    });

    it('rejects invalid signature that is not a hex string', () => {
      const badECDSAObj = {
        ...testECDSAConditionObj,
        signature: 'not-a-hex-string',
      };

      const result = ECDSACondition.validate(ecdsaConditionSchema, badECDSAObj);

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        signature: {
          _errors: ['Invalid hex string'],
        },
      });
    });

    it('rejects invalid curve', () => {
      const badECDSAObj = {
        ...testECDSAConditionObj,
        curve: 'invalid-curve',
      };

      const result = ECDSACondition.validate(ecdsaConditionSchema, badECDSAObj);

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        curve: {
          _errors: expect.arrayContaining([
            expect.stringContaining('Invalid enum value'),
          ]),
        },
      });
    });

    it('accepts valid curves', () => {
      SUPPORTED_ECDSA_CURVES.forEach((curve) => {
        const ecdsaObj = {
          ...testECDSAConditionObj,
          curve,
        };

        const result = ECDSACondition.validate(ecdsaConditionSchema, ecdsaObj);

        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(ecdsaObj);
      });
    });

    it('accepts context variables for message', () => {
      const ecdsaObj = {
        ...testECDSAConditionObj,
        message: ':customMessage',
      };

      const result = ECDSACondition.validate(ecdsaConditionSchema, ecdsaObj);

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(ecdsaObj);
    });

    it('accepts context variables for signature', () => {
      const ecdsaObj = {
        ...testECDSAConditionObj,
        signature: ':customSignature',
      };

      const result = ECDSACondition.validate(ecdsaConditionSchema, ecdsaObj);

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(ecdsaObj);
    });

    it('rejects when curve parameter is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { curve: _curve, ...ecdsaObjWithoutCurve } = testECDSAConditionObj;

      const result = ECDSACondition.validate(
        ecdsaConditionSchema,
        ecdsaObjWithoutCurve,
      );

      expect(result.error).toBeDefined();
      expect(result.error!.issues[0].code).toEqual('invalid_type');
      expect(result.error!.issues[0].path).toEqual(['curve']);
    });

    it('creates valid condition instance', () => {
      const condition = new ECDSACondition({
        message: 'test message',
        signature: 'abcdef123456',
        verifyingKey:
          '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        curve: 'SECP256k1',
      });

      expect(condition.value.conditionType).toBe(ECDSAConditionType);
      expect(condition.value.message).toBe('test message');
      expect(condition.value.signature).toBe('abcdef123456');
      expect(condition.value.curve).toBe('SECP256k1');
    });
  });
});
