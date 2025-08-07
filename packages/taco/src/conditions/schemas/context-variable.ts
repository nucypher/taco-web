import { z } from 'zod';

import { baseConditionSchema } from './common';
import { contextParamSchema } from './context';
import { returnValueTestSchema } from './return-value-test';

export const ContextVariableConditionType = 'context-variable';

export const contextVariableConditionSchema = baseConditionSchema
  .extend({
    conditionType: z.literal(ContextVariableConditionType),
    contextVariable: contextParamSchema.describe(
      'The context variable to check (e.g., ":userAddress", ":customParam")',
    ),
    returnValueTest: returnValueTestSchema,
  })
  .strict()
  .describe(
    'Context Variable Condition for performing comparison operations on context variable values.',
  );

export type ContextVariableConditionProps = z.infer<
  typeof contextVariableConditionSchema
>;
