import { z } from 'zod';

import { Condition } from './condition';
import { commonConditionSchema } from './multi-condition';
import { OmitConditionType, plainStringSchema } from './shared';

export const SequentialConditionType = 'sequential';

export const conditionVariableSchema: z.ZodSchema = z.object({
  varName: plainStringSchema,
  condition: commonConditionSchema,
});

export const sequentialConditionSchema: z.ZodSchema = z.object({
  conditionType: z
    .literal(SequentialConditionType)
    .default(SequentialConditionType),
  conditionVariables: z.array(conditionVariableSchema).min(2).max(5),
  // TODO nesting
});

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
