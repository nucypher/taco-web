import { z } from 'zod';

import { ConditionProps } from '../condition';
import { maxNestedDepth } from '../multi-condition';

import { baseConditionSchema, plainStringSchema } from './common';
import { CompoundConditionType } from './compound';
import { IfThenElseConditionType } from './if-then-else';
import { anyConditionSchema } from './utils';

const getAllNestedConditionVariableNames = (
  condition: ConditionProps,
): string[] => {
  const conditionVariables: string[] = [];
  if (condition.conditionType === SequentialConditionType) {
    for (const variable of condition.conditionVariables) {
      conditionVariables.push(variable.varName);
      conditionVariables.push(
        ...getAllNestedConditionVariableNames(variable.condition),
      );
    }
  } else if (condition.conditionType === IfThenElseConditionType) {
    conditionVariables.push(
      ...getAllNestedConditionVariableNames(condition.ifCondition),
    );
    conditionVariables.push(
      ...getAllNestedConditionVariableNames(condition.thenCondition),
    );
    if (typeof condition.elseCondition !== 'boolean') {
      conditionVariables.push(
        ...getAllNestedConditionVariableNames(condition.elseCondition),
      );
    }
  } else if (condition.conditionType === CompoundConditionType) {
    for (const operand of condition.operands) {
      conditionVariables.push(...getAllNestedConditionVariableNames(operand));
    }
  }
  return conditionVariables;
};

const noDuplicateVarNames = (condition: ConditionProps): boolean => {
  const allVarNames = getAllNestedConditionVariableNames(condition);
  const seen = new Set();
  for (const varName of allVarNames) {
    if (seen.has(varName)) {
      return false; // Duplicate variable name found
    }
    seen.add(varName);
  }
  return true; // No duplicates found
};

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
    (condition) => {
      return noDuplicateVarNames(condition);
    },
    {
      message: 'Duplicate variable names are not allowed',
      path: ['conditionVariables'],
    },
  );

export type SequentialConditionProps = z.infer<
  typeof sequentialConditionSchema
>;
