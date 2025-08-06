import { z } from 'zod';

import { baseConditionSchema } from './common';
import { contextParamSchema } from './context';
import { returnValueTestSchema } from './return-value-test';

export const ContextVariableConditionType = 'variable-match';

export const contextVariableConditionSchema = baseConditionSchema
  .extend({
    conditionType: z.literal(ContextVariableConditionType),
    contextVariable: contextParamSchema.describe(
      'The context variable to check (e.g., ":userAddress", ":customParam")',
    ),
    returnValueTest: returnValueTestSchema.describe(
      'Test to perform on the context variable value. Supports comparators like ==, >, <, >=, <=, !=, in, !in',
    ),
  })
  .strict()
  .describe(
    'Context Variable Condition for checking if a context variable value passes a specified test. Supports various comparison operators.',
  );

export type ContextVariableConditionProps = z.infer<
  typeof contextVariableConditionSchema
>;