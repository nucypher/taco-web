/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from 'vitest';

import {
  JsonApiCondition,
  JsonApiConditionProps,
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

    it.each([
      'unsafe-url',
      'http://http-url.com',
      'mailto://mail@mailserver.org',
      'https://',
    ])('rejects an invalid schema', (badUrl) => {
      const badJsonApiObj = {
        ...testJsonApiConditionObj,
        endpoint: badUrl,
      };

      const result = JsonApiCondition.validate(
        jsonApiConditionSchema,
        badJsonApiObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      const errorMessages = result.error?.errors.map((err) => err.message);
      expect(errorMessages?.includes('Invalid URL')).toBeTruthy();
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

    describe('authorizationType', () => {
      it.each(['Bearer', 'Basic', 'X-API-Key'])(
        'accepts valid authorization types',
        (authType) => {
          const result = JsonApiCondition.validate(jsonApiConditionSchema, {
            ...testJsonApiConditionObj,
            authorizationToken: ':authToken',
            authorizationType: authType,
          });
          expect(result.error).toBeUndefined();
          expect(result.data).toEqual({
            ...testJsonApiConditionObj,
            authorizationToken: ':authToken',
            authorizationType: authType,
          });
        },
      );
      it('authorizationToken must be set if authorizationType is provided', () => {
        const result = JsonApiCondition.validate(jsonApiConditionSchema, {
          ...testJsonApiConditionObj,
          authorizationType: 'Bearer',
        });
        expect(result.error).toBeDefined();
        expect(result.data).toBeUndefined();
        expect(result.error?.format()).toMatchObject({
          authorizationType: {
            _errors: [
              'authorizationToken must be provided if authorizationType is set',
            ],
          },
        });
      });
      it.each(['InvalidType', 'Bearer ', 'Basic123', 'Y-API-Key'])(
        'rejects invalid authorization types',
        (authType) => {
          const result = JsonApiCondition.validate(jsonApiConditionSchema, {
            ...testJsonApiConditionObj,
            authorizationToken: ':authToken',
            authorizationType: authType,
          });
          expect(result.error).toBeDefined();
          expect(result.data).toBeUndefined();
          expect(result.error?.format()).toMatchObject({
            authorizationType: {
              _errors: [
                `Invalid enum value. Expected 'Bearer' | 'Basic' | 'X-API-Key', received '${authType}'`,
              ],
            },
          });
        },
      );
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
        const { parameters, ...noParamsObj } = testJsonApiConditionObj;
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
        const jsonApiConditionObj: JsonApiConditionProps = {
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
