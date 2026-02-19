import { describe, expect, it } from 'vitest';

import {
  MAX_VARIABLE_OPERATIONS,
  OPERATOR_FUNCTIONS,
} from '../../src/conditions/schemas/variable-operation';
import {
  blockchainIntegerReturnValueTestSchema,
  blockchainReturnValueTestSchema,
  returnValueTestSchema,
} from '../../src/conditions/shared';
import { getTestValueForOperation } from '../test-utils';

[blockchainReturnValueTestSchema, returnValueTestSchema].forEach((schema) => {
  describe('validates schema', () => {
    it('throws an error for invalid comparator', async () => {
      const result = schema.safeParse({
        comparator: 'not-a-comparator',
        value: 0,
      });
      expect(result.success).toBe(false);
      expect(result.error?.format()).toMatchObject({
        comparator: {
          _errors: [
            "Invalid enum value. Expected '==' | '>' | '<' | '>=' | '<=' | '!=' | 'in' | '!in', received 'not-a-comparator'",
          ],
        },
      });
    });
    it.each([
      ['>', 0],
      ['>=', 0],
      ['<', 0],
      ['<=', 0],
      ['==', 0],
      ['!=', 0],
      ['in', ['value1', 'value2', 'value3']],
      ['!in', ['value1', 'value2', 'value3']],
    ])('valid comparator value combination', async (testComparator, value) => {
      const result = schema.safeParse({
        comparator: testComparator,
        value: value,
      });
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
    it.each([
      ['in', 0],
      ['in', 'string'],
      ['in', true],
      ['in', []],
      ['!in', 0],
      ['!in', 'string'],
      ['!in', true],
      ['!in', []],
    ])(
      'must be a non-empty array value for "in"/"!in" operators',
      async (testComparator, value) => {
        const result = schema.safeParse({
          comparator: testComparator,
          value: value,
        });
        expect(result.success).toBe(false);
        expect(result.error!.format()).toMatchObject({
          value: {
            _errors: [
              '"value" must be a non-empty array when comparator is "in"/"!in"',
            ],
          },
        });
      },
    );
    it.each(OPERATOR_FUNCTIONS)('allows valid operations', (operation) => {
      const result = schema.safeParse({
        comparator: '==',
        value: 10,
        operations: [
          {
            operation: operation,
            value: getTestValueForOperation(operation),
          },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
    it('requires at least one operation if defined', () => {
      const result = schema.safeParse({
        comparator: '==',
        value: 10,
        operations: [],
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.format()).toMatchObject({
        operations: {
          _errors: ['Array must contain at least 1 element(s)'],
        },
      });
    });
    it(`allows at most ${MAX_VARIABLE_OPERATIONS} operations`, () => {
      const result = schema.safeParse({
        comparator: '==',
        value: 10,
        operations: Array.from(
          { length: MAX_VARIABLE_OPERATIONS + 1 },
          (_, i) => ({
            operation: '+=',
            value: i + 1,
          }),
        ),
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.format()).toMatchObject({
        operations: {
          _errors: [
            `Array must contain at most ${MAX_VARIABLE_OPERATIONS} element(s)`,
          ],
        },
      });
    });
    it('allows multiple valid operations', () => {
      const result = schema.safeParse({
        comparator: '==',
        value: 10,
        operations: [
          { operation: 'index', value: 1 },
          { operation: '+=', value: 5 },
          { operation: '*=', value: 2.5 },
          { operation: 'abs' },
          { operation: '+=', value: BigInt('1000000000000000') },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});

describe('blockchainIntegerReturnValueTestSchema', () => {
  it('coerces string value that represents an integer to number', () => {
    const result = blockchainIntegerReturnValueTestSchema.safeParse({
      comparator: '>=',
      value: '1701428400',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe(1701428400);
      expect(typeof result.data.value).toBe('number');
    }
  });

  it('accepts context param value unchanged (no coercion)', () => {
    const result = blockchainIntegerReturnValueTestSchema.safeParse({
      comparator: '>=',
      value: ':expectedBlocktime',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe(':expectedBlocktime');
      expect(typeof result.data.value).toBe('string');
    }
  });

  it('accepts number value unchanged', () => {
    const result = blockchainIntegerReturnValueTestSchema.safeParse({
      comparator: '>=',
      value: 1701428400,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe(1701428400);
      expect(typeof result.data.value).toBe('number');
    }
  });

  it('accepts bigint value unchanged', () => {
    const value = BigInt(1701428400);
    const result = blockchainIntegerReturnValueTestSchema.safeParse({
      comparator: '>=',
      value,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe(value);
      expect(typeof result.data.value).toBe('bigint');
    }
  });
});

describe('blockchainReturnValueTestSchema does not coerce integer strings', () => {
  it('accepts integer string as plain string (value remains string)', () => {
    const result = blockchainReturnValueTestSchema.safeParse({
      comparator: '>=',
      value: '1701428400',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe('1701428400');
      expect(typeof result.data.value).toBe('string');
    }
  });
});
