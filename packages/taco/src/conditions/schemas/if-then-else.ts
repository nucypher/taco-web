import { z } from 'zod';

import { maxNestedDepth } from '../multi-condition.js';

import { baseConditionSchema } from './common.js';
import { anyConditionSchema } from './utils.js';

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
      // already at 2nd level since checking member condition
      (condition) => maxNestedDepth(2)(condition.ifCondition, 2),
      {
        message: 'Exceeded max nested depth of 2 for multi-condition type',
        path: ['ifCondition'],
      }, // Max nested depth of 2
    )
    .refine(
      // already at 2nd level since checking member condition
      (condition) => maxNestedDepth(2)(condition.thenCondition, 2),
      {
        message: 'Exceeded max nested depth of 2 for multi-condition type',
        path: ['thenCondition'],
      }, // Max nested depth of 2
    )
    .refine(
      (condition) => {
        if (typeof condition.elseCondition !== 'boolean') {
          // already at 2nd level since checking member condition
          return maxNestedDepth(2)(condition.elseCondition, 2);
        }
        return true;
      },
      {
        message: 'Exceeded max nested depth of 2 for multi-condition type',
        path: ['elseCondition'],
      }, // Max nested depth of 2
    ),
);

export type IfThenElseConditionProps = z.infer<
  typeof ifThenElseConditionSchema
>;
