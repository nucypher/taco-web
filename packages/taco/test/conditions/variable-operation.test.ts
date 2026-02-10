import { describe, expect, it } from 'vitest';

import {
  OPERATOR_FUNCTIONS,
  UNARY_OPERATOR_FUNCTIONS,
  variableOperationSchema,
} from '../../src/conditions/schemas/variable-operation';
import { getTestValueForOperation } from '../test-utils';

describe('validates schema', () => {
  it.each(OPERATOR_FUNCTIONS)('allows valid operation', (operation) => {
    const result = variableOperationSchema.safeParse({
      operation: operation,
      value: getTestValueForOperation(operation),
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

describe('toTokenBaseUnits operator', () => {
  it('validates toTokenBaseUnits operator with decimals value', () => {
    const result = variableOperationSchema.safeParse({
      operation: 'toTokenBaseUnits',
      value: 18,
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      operation: 'toTokenBaseUnits',
      value: 18,
    });
  });

  it('validates toTokenBaseUnits operator with context parameter', () => {
    const result = variableOperationSchema.safeParse({
      operation: 'toTokenBaseUnits',
      value: ':tokenDecimals',
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      operation: 'toTokenBaseUnits',
      value: ':tokenDecimals',
    });
  });

  it('rejects toTokenBaseUnits operator without value', () => {
    const result = variableOperationSchema.safeParse({
      operation: 'toTokenBaseUnits',
    });
    expect(result.success).toBe(false);
    expect(result.error!.format()).toMatchObject({
      value: {
        _errors: ['Value must be defined for operation'],
      },
    });
  });
});

describe('create2 operator', () => {
  it('validates create2 operator with deployerAddress and bytecodeHash', () => {
    const result = variableOperationSchema.safeParse({
      operation: 'create2',
      value: {
        deployerAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        bytecodeHash:
          '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      },
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      operation: 'create2',
      value: {
        deployerAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
        bytecodeHash:
          '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      },
    });
  });

  it('validates create2 operator with context parameters', () => {
    const result = variableOperationSchema.safeParse({
      operation: 'create2',
      value: {
        deployerAddress: ':factoryAddress',
        bytecodeHash: ':initCodeHash',
      },
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      operation: 'create2',
      value: {
        deployerAddress: ':factoryAddress',
        bytecodeHash: ':initCodeHash',
      },
    });
  });

  it('validates create2 operator with mixed literal and context parameter', () => {
    const result = variableOperationSchema.safeParse({
      operation: 'create2',
      value: {
        deployerAddress: '0x69Aa2f9fe1572F1B640E1bbc512f5c3a734fc77c',
        bytecodeHash: ':initCodeHash',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects create2 operator without value', () => {
    const result = variableOperationSchema.safeParse({
      operation: 'create2',
    });
    expect(result.success).toBe(false);
    // Multiple validation errors occur: missing value + invalid create2 value structure
    const errors = result.error!.format().value?._errors ?? [];
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects create2 operator with missing deployerAddress', () => {
    const result = variableOperationSchema.safeParse({
      operation: 'create2',
      value: {
        bytecodeHash:
          '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects create2 operator with missing bytecodeHash', () => {
    const result = variableOperationSchema.safeParse({
      operation: 'create2',
      value: {
        deployerAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects create2 operator with primitive value', () => {
    const result = variableOperationSchema.safeParse({
      operation: 'create2',
      value: 5,
    });
    expect(result.success).toBe(false);
  });
});
