import { z } from 'zod';

import { maxNestedDepth } from '../multi-condition.js';

import { baseConditionSchema } from './common.js';
import { anyConditionSchema } from './utils.js';

export const CompoundConditionType = 'compound';

export const compoundConditionSchema: z.ZodSchema = z.lazy(() =>
  baseConditionSchema
    .extend({
      conditionType: z
        .literal(CompoundConditionType)
        .default(CompoundConditionType),
      operator: z.enum(['and', 'or', 'not']),
      operands: z.array(anyConditionSchema).min(1).max(5),
    })
    .refine(
      (condition) => {
        // 'and' and 'or' operators must have at least 2 operands
        if (['and', 'or'].includes(condition.operator)) {
          return condition.operands.length >= 2;
        }

        // 'not' operator must have exactly 1 operand
        if (condition.operator === 'not') {
          return condition.operands.length === 1;
        }

        // We test positive cases exhaustively, so we return false here:
        return false;
      },
      ({ operands, operator }) => ({
        message: `Invalid number of operands ${operands.length} for operator "${operator}"`,
        path: ['operands'],
      }),
    )
    .refine(
      (condition) => maxNestedDepth(2)(condition),
      {
        message: 'Exceeded max nested depth of 2 for multi-condition type',
        path: ['operands'],
      }, // Max nested depth of 2
    ),
);

export type CompoundConditionProps = z.infer<typeof compoundConditionSchema>;
