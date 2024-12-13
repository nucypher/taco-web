/* eslint-disable @typescript-eslint/no-unused-vars */
import { TEST_CONTRACT_ADDR } from '@nucypher/test-utils';
import { describe, expect, it } from 'vitest';

import {
  JWTCondition,
  jwtConditionSchema,
} from '../../../src/conditions/base/jwt';
import { testJWTConditionObj } from '../../test-utils';

describe('JWTCondition', () => {
  describe('validation', () => {
    it('accepts a valid schema', () => {
      const result = JWTCondition.validate(
        jwtConditionSchema,
        testJWTConditionObj,
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testJWTConditionObj);
    });

    it('rejects an invalid schema', () => {
      const badJWTObj = {
        ...testJWTConditionObj,
        subject: TEST_CONTRACT_ADDR,
      };

      const result = JWTCondition.validate(jwtConditionSchema, badJWTObj);

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        subject: {
          _errors: ['Invalid'],
        },
      });
    });
  });
});
