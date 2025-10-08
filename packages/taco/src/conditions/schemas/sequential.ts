import { z } from 'zod';

import { maxNestedDepth } from '../multi-condition.js';

import { baseConditionSchema, plainStringSchema } from './common.js';
import { anyConditionSchema } from './utils.js';

export const SequentialConditionType = 'sequential';

export const conditionVariableSchema: z.ZodSchema = z.lazy(() =>
  z.object({
    varName: plainStringSchema,
    condition: anyConditionSchema,
  }),
);
export type ConditionVariableProps = z.infer<typeof conditionVariableSchema>;

export const sequentialConditionSchema: z.ZodSchema = baseConditionSchema
  .extend({
    conditionType: z
      .literal(SequentialConditionType)
      .default(SequentialConditionType),
    conditionVariables: z.array(conditionVariableSchema).min(2).max(5),
  })
  .refine(
    (condition) => maxNestedDepth(2)(condition),
    {
      message: 'Exceeded max nested depth of 2 for multi-condition type',
      path: ['conditionVariables'],
    }, // Max nested depth of 2
  )
  .refine(
    // check for duplicate var names
    (condition) => {
      const seen = new Set();
      return condition.conditionVariables.every(
        (child: ConditionVariableProps) => {
          if (seen.has(child.varName)) {
            return false;
          }
          seen.add(child.varName);
          return true;
        },
      );
    },
    {
      message: 'Duplicate variable names are not allowed',
      path: ['conditionVariables'],
    },
  );

export type SequentialConditionProps = z.infer<
  typeof sequentialConditionSchema
>;
