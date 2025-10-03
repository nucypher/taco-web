import { z } from 'zod';

import { paramOrContextParamSchema } from './context';

export const OPERATOR_FUNCTIONS = [
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '^=',
  'index',
  'round',
  // operations that don't require 2nd value, keep parameter for simplistic execution consistency
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
] as const;

export const OPERATORS_NOT_REQUIRING_VALUES = [
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
];

export const variableOperationSchema = z
  .object({
    operation: z.enum(OPERATOR_FUNCTIONS),
    value: paramOrContextParamSchema.optional(),
  })
  .refine(
    (data) => {
      if (
        OPERATORS_NOT_REQUIRING_VALUES.includes(data.operation) &&
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
        !OPERATORS_NOT_REQUIRING_VALUES.includes(data.operation) &&
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
  )
  .describe('An operation that can be performed on an obtained result.');

export const MAX_VARIABLE_OPERATIONS = 5;

export const variableOperationsArraySchema = z
  .array(variableOperationSchema)
  .min(1)
  .max(MAX_VARIABLE_OPERATIONS)
  .optional()
  .describe('Optional operations to perform on the obtained result');
