import { z } from 'zod';

import { contractConditionSchema } from './base/contract';
import { rpcConditionSchema } from './base/rpc';
import { timeConditionSchema } from './base/time';

export const CompoundConditionType = 'compound';

export const compoundConditionSchema: z.ZodSchema = z.object({
  conditionType: z
    .literal(CompoundConditionType)
    .default(CompoundConditionType),
  operator: z.enum(['and', 'or']),
  operands: z
    .array(
      z.lazy(() =>
        z.union([
          rpcConditionSchema,
          timeConditionSchema,
          contractConditionSchema,
          compoundConditionSchema,
        ]),
      ),
    )
    .min(2),
});

export type CompoundConditionProps = z.infer<typeof compoundConditionSchema>;
