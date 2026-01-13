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
      // already at 2nd level since checking member condition
      (condition) => maxNestedDepth(4)(condition.ifCondition, 2),
      {
        message: 'Exceeded max nested depth of 4 for multi-condition type',
        path: ['ifCondition'],
      }, // Max nested depth of 4
    )
    .refine(
      // already at 2nd level since checking member condition
      (condition) => maxNestedDepth(4)(condition.thenCondition, 2),
      {
        message: 'Exceeded max nested depth of 4 for multi-condition type',
        path: ['thenCondition'],
      }, // Max nested depth of 4
    )
    .refine(
      (condition) => {
        if (typeof condition.elseCondition !== 'boolean') {
          // already at 2nd level since checking member condition
          return maxNestedDepth(4)(condition.elseCondition, 2);
        }
        return true;
      },
      {
        message: 'Exceeded max nested depth of 4 for multi-condition type',
        path: ['elseCondition'],
      }, // Max nested depth of 4
    ),
);

export type IfThenElseConditionProps = z.infer<
  typeof ifThenElseConditionSchema
>;
