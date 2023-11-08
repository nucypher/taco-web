import { z } from 'zod';

import { contractConditionSchema } from './contract';
import { rpcConditionSchema } from './rpc';
import { timeConditionSchema } from './time';

export const CompoundConditionType = 'compound';

export const compoundConditionSchema: z.ZodSchema = z
  .object({
    conditionType: z
      .literal(CompoundConditionType)
      .default(CompoundConditionType),
    operator: z.enum(['and', 'or', 'not']),
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
      .min(1),
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
  );

export type CompoundConditionProps = z.infer<typeof compoundConditionSchema>;
