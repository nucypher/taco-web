import { z } from 'zod';

import { baseConditionSchema } from './common';
import { blockchainReturnValueTestSchema } from './return-value-test';

export const SigningObjectAttributeConditionType = 'attribute';

export const SIGNING_CONDITION_OBJECT_CONTEXT_VAR = ':signingConditionObject';

const baseSigningObjectConditionSchema = baseConditionSchema.extend({
  signingObjectContextVar: z
    .literal(SIGNING_CONDITION_OBJECT_CONTEXT_VAR)
    .default(SIGNING_CONDITION_OBJECT_CONTEXT_VAR)
    .describe(
      'The context variable that will be replaced with the signing object at signing',
    ),
});

export const signingObjectAttributeConditionSchema: z.ZodSchema =
  baseSigningObjectConditionSchema.extend({
    conditionType: z
      .literal(SigningObjectAttributeConditionType)
      .default(SigningObjectAttributeConditionType),
    attribute_name: z.string().describe('The name of the attribute to check'),
    returnValueTest: blockchainReturnValueTestSchema,
  });

export type SigningObjectAttributeConditionProps = z.infer<
  typeof signingObjectAttributeConditionSchema
>;
