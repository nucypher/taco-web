import { z } from 'zod';

import { ConditionProps } from '../condition.js';
import { maxNestedDepth } from '../multi-condition.js';

import { baseConditionSchema, plainStringSchema } from './common.js';
import { CompoundConditionType } from './compound.js';
import { IfThenElseConditionType } from './if-then-else.js';
import { anyConditionSchema } from './utils.js';
import { variableOperationsArraySchema } from './variable-operation.js';

export const getAllNestedConditionVariableNames = (
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
  const duplicates = allVarNames.filter(
    (item, index) => allVarNames.indexOf(item) !== index,
  );
  return duplicates.length === 0;
};

export const SequentialConditionType = 'sequential';

export const conditionVariableSchema: z.ZodSchema = z.lazy(() =>
  z
    .object({
      varName: plainStringSchema,
      condition: anyConditionSchema,
      operations: variableOperationsArraySchema.describe(
        'Optional operations to perform on the obtained condition result before storing it',
      ),
    })
    .describe(
      'Executes a condition and stores the result as a variable within a sequential condition.',
    ),
);

export type ConditionVariableProps = z.infer<typeof conditionVariableSchema>;

export const sequentialConditionSchema: z.ZodSchema = baseConditionSchema
  .extend({
    conditionType: z
      .literal(SequentialConditionType)
      .default(SequentialConditionType),
    conditionVariables: z.array(conditionVariableSchema).min(2).max(20),
  })
  .refine(
    (condition) => maxNestedDepth(4)(condition),
    {
      message: 'Exceeded max nested depth of 4 for multi-condition type',
      path: ['conditionVariables'],
    }, // Max nested depth of 4
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
