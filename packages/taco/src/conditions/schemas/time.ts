import { z } from 'zod';

import { rpcConditionSchema } from './rpc.js';

// TimeCondition is an RpcCondition with the method set to 'blocktime' and no parameters

export const TimeConditionType = 'time';
export const TimeConditionMethod = 'blocktime';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { parameters: _, ...restShape } = rpcConditionSchema.shape;
export const timeConditionSchema = z.object({
  ...restShape,
  conditionType: z.literal(TimeConditionType).default(TimeConditionType),
  method: z.literal(TimeConditionMethod).default(TimeConditionMethod),
});

export type TimeConditionProps = z.infer<typeof timeConditionSchema>;
