import { z } from 'zod';

import { rpcConditionSchema } from './rpc';

// TimeCondition is an RpcCondition with the method set to 'blocktime' and no parameters
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { parameters: _, ...restShape } = rpcConditionSchema.shape;

export const timeConditionSchema = z.object({
  ...restShape,
  conditionType: z.literal('time').default('time'),
  method: z.literal('blocktime').default('blocktime'),
});

export type TimeConditionProps = z.infer<typeof timeConditionSchema>;
