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
    it.each([
      [{ store: { book: [{ price: 10.5 }] } }, '$.store.book[0].price', 10.5],
      [[1, 2, 3, 4, 5], '$[2]', 3],
      [42, undefined, 42],
      ['hello world', undefined, 'hello world'],
      [true, undefined, true],
    ])('accepts valid schema with data: %j', (data, query, expectedValue) => {
      const testJsonConditionObj: JsonConditionProps = {
        conditionType: JsonConditionType,
        data,
        query,
        returnValueTest: {
          comparator: '==',
          value: expectedValue,
        },
      };

      const result = JsonCondition.validate(
        jsonConditionSchema,
        testJsonConditionObj,
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testJsonConditionObj);
    });

    it('accepts JSON-looking string as string data (not parsed as JSON)', () => {
      const jsonString = '{ "store": { "book": [{ "price": 10.5 }] } }';
      const testJsonConditionObj: JsonConditionProps = {
        conditionType: JsonConditionType,
        data: jsonString,
        returnValueTest: {
          comparator: '==',
          value: jsonString,
        },
      };

      const result = JsonCondition.validate(
        jsonConditionSchema,
        testJsonConditionObj,
      );

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual(testJsonConditionObj);
      // Verify it's still a string, not parsed
      expect(typeof result.data?.data).toBe('string');
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
          data: { test: 'data' },
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
            data: { test: 'data' },
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
      it('allows context variables in query and return value test', () => {
        const result = JsonCondition.validate(jsonConditionSchema, {
          conditionType: JsonConditionType,
          data: { prices: { usd: 100 } },
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
