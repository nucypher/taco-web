import { z } from 'zod';

import {
  paramOrContextParamSchema,
  rpcParamOrContextParamSchema,
} from './context';

const returnValueTestBaseSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  comparator: z.enum(['==', '>', '<', '>=', '<=', '!=']),
});

export const returnValueTestSchema = returnValueTestBaseSchema.extend({
  value: paramOrContextParamSchema,
});

export const rpcReturnValueTestSchema = returnValueTestBaseSchema.extend({
  value: rpcParamOrContextParamSchema,
});

export type ReturnValueTestProps = z.infer<typeof returnValueTestSchema>;

export type RpcReturnValueTestProps = z.infer<typeof rpcReturnValueTestSchema>;
