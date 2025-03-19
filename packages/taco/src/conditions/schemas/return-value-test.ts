import { z } from 'zod';

import {
  nonFloatParamOrContextParamSchema,
  paramOrContextParamSchema,
} from './context';

const returnValueTestBaseSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  comparator: z.enum(['==', '>', '<', '>=', '<=', '!=']),
});

export const returnValueTestSchema = returnValueTestBaseSchema.extend({
  value: paramOrContextParamSchema,
});

export const nonFloatReturnValueTestSchema = returnValueTestBaseSchema.extend({
  value: nonFloatParamOrContextParamSchema,
});

export type ReturnValueTestProps = z.infer<typeof returnValueTestSchema>;

export type NonFloatReturnValueTestProps = z.infer<
  typeof nonFloatReturnValueTestSchema
>;
