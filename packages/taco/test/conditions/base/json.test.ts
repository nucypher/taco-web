/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, expect, it } from 'vitest';

import {
  JsonCondition,
  JsonConditionProps,
  jsonConditionSchema,
  JsonConditionType,
} from '../../../src/conditions/base/json';

describe('JsonCondition', () => {
  describe('validation', () => {
    it('accepts valid schema with context variable data', () => {
      const testJsonConditionObj: JsonConditionProps = {
        conditionType: JsonConditionType,
        data: ':jsonData',
        query: '$.store.book[0].price',
        returnValueTest: {
          comparator: '==',
          value: 10.5,
        },
      };

      const result = JsonCondition.validate(
        jsonConditionSchema,
        testJsonConditionObj,
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testJsonConditionObj);
    });

    it('accepts valid schema without query', () => {
      const testJsonConditionObj: JsonConditionProps = {
        conditionType: JsonConditionType,
        data: ':jsonData',
        returnValueTest: {
          comparator: '==',
          value: 42,
        },
      };

      const result = JsonCondition.validate(
        jsonConditionSchema,
        testJsonConditionObj,
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testJsonConditionObj);
    });

    it('rejects non-context variable data', () => {
      const testJsonConditionObj = {
        conditionType: JsonConditionType,
        data: { store: { book: [{ price: 10.5 }] } },
        returnValueTest: {
          comparator: '==',
          value: 10.5,
        },
      };

      const result = JsonCondition.validate(
        jsonConditionSchema,
        testJsonConditionObj as unknown as JsonConditionProps,
      );

      expect(result.error).toBeDefined();
    });

    describe('query validation', () => {
      it.each([
        '$.store.book[0].price',
        '$[2]',
        '$.prices.usd',
        '$.store.book[*].price',
        '$..price',
      ])('accepts valid JSONPath query: %s', (query) => {
        const result = JsonCondition.validate(jsonConditionSchema, {
          conditionType: JsonConditionType,
          data: ':jsonData',
          query,
          returnValueTest: { comparator: '==', value: 0 },
        });

        expect(result.error).toBeUndefined();
      });

      it.each(['not-a-jsonpath', '$..[', 'random string'])(
        'rejects invalid JSONPath query: %s',
        (query) => {
          const result = JsonCondition.validate(jsonConditionSchema, {
            conditionType: JsonConditionType,
            data: ':jsonData',
            query,
            returnValueTest: { comparator: '==', value: 0 },
          });

          expect(result.error).toBeDefined();
          const errorMessages = result.error?.errors.map((err) => err.message);
          expect(
            errorMessages?.includes('Invalid JSONPath expression'),
          ).toBeTruthy();
        },
      );
    });

    describe('context variables', () => {
      it('allows context variables in data, query and return value test', () => {
        const result = JsonCondition.validate(jsonConditionSchema, {
          conditionType: JsonConditionType,
          data: ':priceData',
          query: '$.prices.:currency',
          returnValueTest: { comparator: '==', value: ':expectedValue' },
        });

        expect(result.error).toBeUndefined();
      });
    });

    it('rejects invalid condition type', () => {
      const result = JsonCondition.validate(jsonConditionSchema, {
        conditionType: 'invalid-type',
        data: { test: 'data' },
        returnValueTest: { comparator: '==', value: 0 },
      } as unknown as JsonConditionProps);

      expect(result.error).toBeDefined();
    });
  });
});
