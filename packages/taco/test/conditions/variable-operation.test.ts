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

describe('*pow= operator', () => {
  it('validates *pow= operator with array value', () => {
    const result = variableOperationSchema.safeParse({
      operation: '*pow=',
      value: [10, 18],
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      operation: '*pow=',
      value: [10, 18],
    });
  });

  it('validates *pow= operator with context parameter in array', () => {
    const result = variableOperationSchema.safeParse({
      operation: '*pow=',
      value: [10, ':tokenDecimals'],
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      operation: '*pow=',
      value: [10, ':tokenDecimals'],
    });
  });

  it('rejects *pow= operator without value', () => {
    const result = variableOperationSchema.safeParse({
      operation: '*pow=',
    });
    expect(result.success).toBe(false);
    expect(result.error!.format()).toMatchObject({
      value: {
        _errors: ['Value must be defined for operation'],
      },
    });
  });
});
