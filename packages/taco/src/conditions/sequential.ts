import { z } from 'zod';

import { contractConditionSchema } from './base/contract';
import { rpcConditionSchema } from './base/rpc';
import { timeConditionSchema } from './base/time';
import { compoundConditionSchema } from './compound-condition';
import { baseConditionSchema, Condition } from './condition';
import { maxNestedDepth } from './multi-condition';
import { OmitConditionType, plainStringSchema } from './shared';

export const SequentialConditionType = 'sequential';

export const conditionVariableSchema: z.ZodSchema = z.object({
  varName: plainStringSchema,
  condition: z.lazy(() =>
    z.union([
      rpcConditionSchema,
      timeConditionSchema,
      contractConditionSchema,
      compoundConditionSchema,
      sequentialConditionSchema,
    ]),
  ),
});

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
  );

export type ConditionVariableProps = z.infer<typeof conditionVariableSchema>;

export type SequentialConditionProps = z.infer<
  typeof sequentialConditionSchema
>;

export class SequentialCondition extends Condition {
  constructor(value: OmitConditionType<SequentialConditionProps>) {
    super(sequentialConditionSchema, {
      conditionType: SequentialConditionType,
      ...value,
    });
  }
}
