import { z } from 'zod';

import { maxNestedDepth } from '../multi-condition';

import { baseConditionSchema } from './common';
import { anyConditionSchema } from './utils';

export const IfThenElseConditionType = 'if-then-else';

export const ifThenElseConditionSchema: z.ZodSchema = z.lazy(() =>
  baseConditionSchema
    .extend({
      conditionType: z
        .literal(IfThenElseConditionType)
        .default(IfThenElseConditionType),
      ifCondition: anyConditionSchema,
      thenCondition: anyConditionSchema,
      elseCondition: z.union([anyConditionSchema, z.boolean()]),
    })
    .refine(
      (condition) => maxNestedDepth(2)(condition),
      {
        message: 'Exceeded max nested depth of 2 for multi-condition type',
      }, // Max nested depth of 2
    ),
);

export type IfThenElseConditionProps = z.infer<
  typeof ifThenElseConditionSchema
>;
