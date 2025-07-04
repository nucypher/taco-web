/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from 'vitest';

import {
  JsonRpcCondition,
  JsonRpcConditionProps,
  jsonRpcConditionSchema,
  JsonRpcConditionType,
} from '../../../src/conditions/base/json-rpc';
import { testJsonRpcConditionObj } from '../../test-utils';

describe('JsonRpcCondition', () => {
  describe('validation', () => {
    it('accepts a valid schema', () => {
      const result = JsonRpcCondition.validate(
        jsonRpcConditionSchema,
        testJsonRpcConditionObj,
      );
      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testJsonRpcConditionObj);
    });

    it.each([
      'unsafe-url',
      'http://http-url.com',
      'mailto://mail@mailserver.org',
      'https://',
    ])('rejects an invalid schema', (badUrl) => {
      const badJsonRpcObj = {
        ...testJsonRpcConditionObj,
        endpoint: badUrl,
      };

      const result = JsonRpcCondition.validate(
        jsonRpcConditionSchema,
        badJsonRpcObj,
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      const errorMessages = result.error?.errors.map((err) => err.message);
      expect(errorMessages?.includes('Invalid URL')).toBeTruthy();
    });

    describe('authorizationToken', () => {
      it('accepts context variable', () => {
        const result = JsonRpcCondition.validate(jsonRpcConditionSchema, {
          ...testJsonRpcConditionObj,
          authorizationToken: ':authToken',
        });
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual({
          ...testJsonRpcConditionObj,
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
        const result = JsonRpcCondition.validate(jsonRpcConditionSchema, {
          ...testJsonRpcConditionObj,
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
          const result = JsonRpcCondition.validate(jsonRpcConditionSchema, {
            ...testJsonRpcConditionObj,
            authorizationToken: ':authToken',
            authorizationType: authType,
          });
          expect(result.error).toBeUndefined();
          expect(result.data).toEqual({
            ...testJsonRpcConditionObj,
            authorizationToken: ':authToken',
            authorizationType: authType,
          });
        },
      );
      it('authorizationToken must be set if authorizationType is provided', () => {
        const result = JsonRpcCondition.validate(jsonRpcConditionSchema, {
          ...testJsonRpcConditionObj,
          authorizationType: 'Basic',
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
          const result = JsonRpcCondition.validate(jsonRpcConditionSchema, {
            ...testJsonRpcConditionObj,
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

    describe('properties', () => {
      it('accepts conditions without query path', () => {
        const { query, ...noQueryObj } = testJsonRpcConditionObj;
        const result = JsonRpcCondition.validate(
          jsonRpcConditionSchema,
          noQueryObj,
        );

        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(noQueryObj);
      });

      it('accepts conditions without params', () => {
        const { params, ...noParamsObj } = testJsonRpcConditionObj;
        const result = JsonRpcCondition.validate(
          jsonRpcConditionSchema,
          noParamsObj,
        );

        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(noParamsObj);
      });

      it('accepts conditions with params as dictionary', () => {
        const result = JsonRpcCondition.validate(jsonRpcConditionSchema, {
          ...testJsonRpcConditionObj,
          params: {
            value1: 42,
            value2: 23,
          },
        });
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual({
          ...testJsonRpcConditionObj,
          params: {
            value1: 42,
            value2: 23,
          },
        });
      });
    });

    describe('context variables', () => {
      it('allow context variables for various values including as substring', () => {
        const testJsonRpcConditionObjWithContextVars: JsonRpcConditionProps = {
          conditionType: JsonRpcConditionType,
          endpoint: 'https://math.example.com/:version/simple',
          method: ':methodContextVar',
          params: {
            value1: 42,
            value2: ':value2',
          },
          query: '$.:queryKey',
          authorizationToken: ':authToken',
          returnValueTest: {
            comparator: '==',
            value: ':expectedResult',
          },
        };

        const result = JsonRpcCondition.validate(
          jsonRpcConditionSchema,
          testJsonRpcConditionObjWithContextVars,
        );
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual(testJsonRpcConditionObjWithContextVars);
      });
    });
  });
});
