import { z } from 'zod';

import { paramOrContextParamSchema } from './context';

const OPERATOR_FUNCTIONS = [
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

const OPERATORS_NOT_REQUIRING_VALUES = [
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
      if (OPERATORS_NOT_REQUIRING_VALUES.includes(data.operation)) {
        return data.value === undefined;
      }
      return data.value !== undefined;
    },
    {
      message: 'Invalid value defined for operation',
      path: ['value'],
    },
  );
