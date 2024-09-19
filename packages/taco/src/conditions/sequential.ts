import { z } from 'zod';

import { contractConditionSchema } from './base/contract';
import { rpcConditionSchema } from './base/rpc';
import { timeConditionSchema } from './base/time';
import { compoundConditionSchema } from './compound-condition';
import { Condition } from './condition';
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

export const sequentialConditionSchema: z.ZodSchema = z.object({
  conditionType: z
    .literal(SequentialConditionType)
    .default(SequentialConditionType),
  conditionVariables: z.array(conditionVariableSchema).min(2).max(5),
  // TODO nesting validation
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
