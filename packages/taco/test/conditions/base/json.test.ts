import { describe, expect, it } from 'vitest';

import {
  JsonApiCondition,
  JsonApiConditionSchema,
} from '../../../src/conditions/base/json-api';
import { testJsonApiConditionObj } from '../../test-utils';

describe('JsonApiCondition', () => {
  describe('validation', () => {
    it('accepts a valid schema', () => {
      const result = JsonApiCondition.validate(
        JsonApiConditionSchema,
        testJsonApiConditionObj,
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testJsonApiConditionObj);
    });

    it('rejects an invalid schema', () => {
      const badJsonApiObj = {
        ...testJsonApiConditionObj,
        endpoint: 'not-a-url',
      };

      const result = JsonApiCondition.validate(JsonApiConditionSchema, badJsonApiObj);

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        endpoint: {
          _errors: ['Invalid url'],
        },
      });
    });
    
    describe('parameters', () => {
      it('accepts conditions without query path', () => {
        const {query, ...noQueryObj} = testJsonApiConditionObj;
        const result = JsonApiCondition.validate(
          JsonApiConditionSchema,
          noQueryObj
        );
  
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(noQueryObj);
      });

      it('accepts conditions without parameters', () => {
        const {parameters, ...noParamsObj} = testJsonApiConditionObj;
        const result = JsonApiCondition.validate(
          JsonApiConditionSchema,
          noParamsObj
        );
  
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(noParamsObj);
      });
    });
  });
});
