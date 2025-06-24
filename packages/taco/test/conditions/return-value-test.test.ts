import { describe, expect, it } from 'vitest';

import {
  blockchainReturnValueTestSchema,
  returnValueTestSchema,
} from '../../src/conditions/shared';

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
  });
});
