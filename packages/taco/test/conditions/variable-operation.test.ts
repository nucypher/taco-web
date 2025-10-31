import { describe, expect, it } from 'vitest';

import {
  OPERATOR_FUNCTIONS,
  UNARY_OPERATOR_FUNCTIONS,
  variableOperationSchema,
} from '../../src/conditions/schemas/variable-operation';

describe('validates schema', () => {
  it.each(OPERATOR_FUNCTIONS)('allows valid operation', (operation) => {
    const result = variableOperationSchema.safeParse({
      operation: operation,
      value: UNARY_OPERATOR_FUNCTIONS.includes(operation) ? undefined : 5,
    });
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
  it.each(UNARY_OPERATOR_FUNCTIONS)(
    'disallows operations when value is missing for operation that requires a value',
    (operation) => {
      const result = variableOperationSchema.safeParse({
        operation: operation,
        value: 5, // value should be omitted for these operations
      });
      expect(result.success).toBe(false);
      expect(result.error!.format()).toMatchObject({
        value: {
          _errors: ['Value not allowed for this operation'],
        },
      });
    },
  );

  it.each(
    OPERATOR_FUNCTIONS.filter((op) => !UNARY_OPERATOR_FUNCTIONS.includes(op)),
  )(
    'disallows operations when value is not provided for operation that requires a value',
    (operation) => {
      const result = variableOperationSchema.safeParse({
        operation: operation,
        // value is missing for these operations
      });
      expect(result.success).toBe(false);
      expect(result.error!.format()).toMatchObject({
        value: {
          _errors: ['Value must be defined for operation'],
        },
      });
    },
  );
});

describe('new operators', () => {
  describe('JSON conversion', () => {
    it('toJson converts object to JSON string', () => {
      const result = variableOperationSchema.safeParse({
        operation: 'toJson',
      });
      expect(result.success).toBe(true);
    });

    it('toJson converts array to JSON string', () => {
      const result = variableOperationSchema.safeParse({
        operation: 'toJson',
      });
      expect(result.success).toBe(true);
    });

    it('fromJson parses JSON string to object', () => {
      const result = variableOperationSchema.safeParse({
        operation: 'fromJson',
      });
      expect(result.success).toBe(true);
    });

    it('fromJson parses JSON string to array', () => {
      const result = variableOperationSchema.safeParse({
        operation: 'fromJson',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('hex conversion', () => {
    it('toHex converts bytes to hex string', () => {
      const result = variableOperationSchema.safeParse({
        operation: 'toHex',
      });
      expect(result.success).toBe(true);
    });

    it('toHex converts string to hex', () => {
      const result = variableOperationSchema.safeParse({
        operation: 'toHex',
      });
      expect(result.success).toBe(true);
    });

    it('toHex converts integers to hex', () => {
      const result = variableOperationSchema.safeParse({
        operation: 'toHex',
      });
      expect(result.success).toBe(true);
    });

    it('fromHex converts hex string to bytes', () => {
      const result = variableOperationSchema.safeParse({
        operation: 'fromHex',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('keccak hashing', () => {
    it('keccak hashes strings', () => {
      const result = variableOperationSchema.safeParse({
        operation: 'keccak',
      });
      expect(result.success).toBe(true);
    });

    it('keccak hashes empty string', () => {
      const result = variableOperationSchema.safeParse({
        operation: 'keccak',
      });
      expect(result.success).toBe(true);
    });

    it('keccak hashes integers', () => {
      const result = variableOperationSchema.safeParse({
        operation: 'keccak',
      });
      expect(result.success).toBe(true);
    });

    it('keccak hashes bytes', () => {
      const result = variableOperationSchema.safeParse({
        operation: 'keccak',
      });
      expect(result.success).toBe(true);
    });
  });
});
