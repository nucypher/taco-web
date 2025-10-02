import { describe, expect, it } from 'vitest';

import {
  OPERATOR_FUNCTIONS,
  OPERATORS_NOT_REQUIRING_VALUES,
  variableOperationSchema,
} from '../../src/conditions/schemas/variable-operation';

describe('validates schema', () => {
  it.each(OPERATOR_FUNCTIONS)('allows valid operation', (operation) => {
    const result = variableOperationSchema.safeParse({
      operation: operation,
      value: OPERATORS_NOT_REQUIRING_VALUES.includes(operation) ? undefined : 5,
    });
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
  it.each(OPERATORS_NOT_REQUIRING_VALUES)(
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
    OPERATOR_FUNCTIONS.filter(
      (op) => !OPERATORS_NOT_REQUIRING_VALUES.includes(op),
    ),
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
