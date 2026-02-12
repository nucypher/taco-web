import { z } from 'zod';

import { contextParamSchema, paramOrContextParamSchema } from './context';

const hexPrefixedStringSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]+$/, 'Must be a 0x-prefixed hex string');

const create2ValueSchema = z
  .object(
    {
      deployerAddress: z.union([hexPrefixedStringSchema, contextParamSchema]),
      bytecodeHash: z.union([hexPrefixedStringSchema, contextParamSchema]),
    },
    {
      required_error: 'Value must be defined for operation',
      invalid_type_error:
        'create2 operation requires an object with deployerAddress and bytecodeHash',
    },
  )
  .describe(
    'Value for create2 operation containing deployerAddress and bytecodeHash for computing CREATE2 addresses locally.',
  );

export const OPERATOR_FUNCTIONS = [
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  'toTokenBaseUnits',
  'index',
  'round',
  // operations that don't require 2nd value
  'abs',
  'avg',
  'ceil',
  'ethToWei',
  'floor',
  'len',
  'max',
  'min',
  'sum',
  'weiToEth',
  // casting
  'bool',
  'float',
  'int',
  'str',
  // JSON conversion
  'fromJson',
  'toJson',
  // hex conversion
  'fromHex',
  'toHex',
  // hashing
  'keccak',
  // address computation
  'create2',
] as const;

export const UNARY_OPERATOR_FUNCTIONS = [
  'abs',
  'avg',
  'ceil',
  'ethToWei',
  'floor',
  'len',
  'max',
  'min',
  'sum',
  'weiToEth',
  // casting
  'bool',
  'float',
  'int',
  'str',
  // JSON conversion
  'fromJson',
  'toJson',
  // hex conversion
  'fromHex',
  'toHex',
  // hashing
  'keccak',
];

const baseVariableOperationSchema = z.object({
  operation: z.enum(OPERATOR_FUNCTIONS),
  value: z.any().optional(),
});

const commonVariableOperationSchema = baseVariableOperationSchema
  .extend({
    operation: z.enum(
      OPERATOR_FUNCTIONS.filter((op) => op !== 'create2') as [
        string,
        ...string[],
      ],
    ),
    value: paramOrContextParamSchema.optional(),
  })
  .refine(
    (data) => {
      if (
        UNARY_OPERATOR_FUNCTIONS.includes(data.operation) &&
        data.value !== undefined
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Value not allowed for this operation',
      path: ['value'],
    },
  )
  .refine(
    (data) => {
      if (
        !UNARY_OPERATOR_FUNCTIONS.includes(data.operation) &&
        data.value === undefined
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Value must be defined for operation',
      path: ['value'],
    },
  );

const create2VariableOperationSchema = baseVariableOperationSchema.extend({
  operation: z.literal('create2'),
  value: create2ValueSchema,
});

export const variableOperationSchema = z
  .union([commonVariableOperationSchema, create2VariableOperationSchema])
  .describe('An operation that can be performed on an obtained result.');

export const MAX_VARIABLE_OPERATIONS = 5;

export const variableOperationsArraySchema = z
  .array(variableOperationSchema)
  .min(1)
  .max(MAX_VARIABLE_OPERATIONS)
  .optional()
  .describe('Optional operations to perform on the obtained result');
