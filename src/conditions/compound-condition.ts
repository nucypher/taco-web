import { z } from 'zod';

import { contractConditionSchema } from './base';
import { rpcConditionSchema } from './base';
import { timeConditionSchema } from './base';

export const compoundConditionSchema: z.ZodSchema = z.object({
  conditionType: z.literal('compound').default('compound'),
  operator: z.enum(['and', 'or']),
  operands: z
    .array(
      z.lazy(() =>
        z.union([
          rpcConditionSchema,
          timeConditionSchema,
          contractConditionSchema,
          compoundConditionSchema,
        ])
      )
    )
    .min(2),
});

export type CompoundConditionProps = z.infer<typeof compoundConditionSchema>;
