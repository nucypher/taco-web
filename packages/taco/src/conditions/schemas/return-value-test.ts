import { z } from 'zod';

import {
  blockchainParamOrContextParamSchema,
  paramOrContextParamSchema,
} from './context';

const returnValueTestBaseSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  comparator: z.enum(['==', '>', '<', '>=', '<=', '!=', 'in', '!in']),
});

const requireNonEmptyArrayIfComparatorIsIn = (data: {
  comparator: '==' | '>' | '<' | '>=' | '<=' | '!=' | 'in' | '!in';
  value?: unknown;
  index?: number | undefined;
}): boolean => {
  if (data.comparator === 'in' || data.comparator === '!in') {
    return Array.isArray(data.value) && data.value.length > 0;
  }
  return true;
};

const inComparatorErrorConfig = {
  message: `"value" must be a non-empty array when comparator is "in"/"!in"`,
  path: ['value'],
};

export const returnValueTestSchema = returnValueTestBaseSchema
  .extend({
    value: paramOrContextParamSchema,
  })
  .refine(requireNonEmptyArrayIfComparatorIsIn, inComparatorErrorConfig)
  .describe(
    'Test to perform on a value. Supports comparison operators like ==, >, <, >=, <=, !=, in, !in',
  );

export const blockchainReturnValueTestSchema = returnValueTestBaseSchema
  .extend({
    value: blockchainParamOrContextParamSchema,
  })
  .refine(requireNonEmptyArrayIfComparatorIsIn, inComparatorErrorConfig);

export type ReturnValueTestProps = z.infer<typeof returnValueTestSchema>;

export type BlockchainReturnValueTestProps = z.infer<
  typeof blockchainReturnValueTestSchema
>;
