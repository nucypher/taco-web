import { z } from 'zod';

import { baseConditionSchema, jsonPathSchema } from './common.js';
import { contextParamSchema } from './context.js';
import { returnValueTestSchema } from './return-value-test.js';

export const JsonConditionType = 'json';

export const jsonConditionSchema = baseConditionSchema.extend({
  conditionType: z.literal(JsonConditionType).default(JsonConditionType),
  data: contextParamSchema.describe(
    'Context variable that resolves to JSON data at decryption time.',
  ),
  query: jsonPathSchema
    .optional()
    .describe(
      'Optional JSONPath query to extract a specific value from the data.',
    ),
  returnValueTest: returnValueTestSchema,
});

export type JsonConditionProps = z.infer<typeof jsonConditionSchema>;
