/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from 'vitest';

import {
  JsonApiCondition,
  jsonApiConditionSchema,
  JsonApiConditionType,
} from '../../../src/conditions/base/json-api';
import { testJsonApiConditionObj } from '../../test-utils';

describe('JsonApiCondition', () => {
  describe('validation', () => {
    it('accepts a valid schema', () => {
      const result = JsonApiCondition.validate(
        jsonApiConditionSchema,
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

      const result = JsonApiCondition.validate(
        jsonApiConditionSchema,
        badJsonApiObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        endpoint: {
          _errors: ['Invalid url'],
        },
      });
    });

    describe('authorizationToken', () => {
      it('accepts context variable', () => {
        const result = JsonApiCondition.validate(jsonApiConditionSchema, {
          ...testJsonApiConditionObj,
          authorizationToken: ':authToken',
        });
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual({
          ...testJsonApiConditionObj,
          authorizationToken: ':authToken',
        });
      });
      it.each([
        'authToken',
        'ABCDEF1234567890',
        ':authToken?',
        '$:authToken',
        ':auth-Token',
      ])('rejects invalid context variable', (contextVar) => {
        const result = JsonApiCondition.validate(jsonApiConditionSchema, {
          ...testJsonApiConditionObj,
          authorizationToken: `${contextVar}`,
        });
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error?.format()).toMatchObject({
          authorizationToken: {
            _errors: ['Invalid'],
          },
        });
      });
    });

    describe('parameters', () => {
      it('accepts conditions without query path', () => {
        const { query, ...noQueryObj } = testJsonApiConditionObj;
        const result = JsonApiCondition.validate(
          jsonApiConditionSchema,
          noQueryObj,
        );

        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(noQueryObj);
      });

      it('accepts conditions without parameters', () => {
        const { query, ...noParamsObj } = testJsonApiConditionObj;
        const result = JsonApiCondition.validate(
          jsonApiConditionSchema,
          noParamsObj,
        );

        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(noParamsObj);
      });
    });

    describe('context variables', () => {
      it('allow context variables for various values including as substring', () => {
        const jsonApiConditionObj = {
          conditionType: JsonApiConditionType,
          endpoint:
            'https://api.coingecko.com/api/:version/simple/:endpointPath',
          parameters: {
            ids: 'ethereum',
            vs_currencies: ':vsCurrency',
          },
          query: 'ethereum.:vsCurrency',
          authorizationToken: ':authToken',
          returnValueTest: {
            comparator: '==',
            value: ':expectedPrice',
          },
        };
        const result = JsonApiCondition.validate(
          jsonApiConditionSchema,
          jsonApiConditionObj,
        );
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(jsonApiConditionObj);
      });
    });
  });
});
