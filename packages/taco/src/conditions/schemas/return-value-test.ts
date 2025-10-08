import { z } from 'zod';

import {
  blockchainParamOrContextParamSchema,
  paramOrContextParamSchema,
} from './context.js';

const returnValueTestBaseSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  comparator: z.enum(['==', '>', '<', '>=', '<=', '!=']),
});

export const returnValueTestSchema = returnValueTestBaseSchema.extend({
  value: paramOrContextParamSchema,
});

export const blockchainReturnValueTestSchema = returnValueTestBaseSchema.extend(
  {
    value: blockchainParamOrContextParamSchema,
  },
);

export type ReturnValueTestProps = z.infer<typeof returnValueTestSchema>;

export type BlockchainReturnValueTestProps = z.infer<
  typeof blockchainReturnValueTestSchema
>;
