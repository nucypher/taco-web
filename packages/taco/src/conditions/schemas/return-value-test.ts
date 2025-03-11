import { z } from 'zod';

import {
  paramOrContextParamSchema,
  rpcParamOrContextParamSchema,
} from './context';

export const returnValueTestSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  comparator: z.enum(['==', '>', '<', '>=', '<=', '!=']),
  value: paramOrContextParamSchema,
});

export const rpcReturnValueTestSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  comparator: z.enum(['==', '>', '<', '>=', '<=', '!=']),
  value: rpcParamOrContextParamSchema,
});

export type ReturnValueTestProps = z.infer<typeof returnValueTestSchema>;

export type RpcReturnValueTestProps = z.infer<typeof rpcReturnValueTestSchema>;
