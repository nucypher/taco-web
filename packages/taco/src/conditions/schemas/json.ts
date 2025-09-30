import { z } from 'zod';

import { baseConditionSchema, jsonPathSchema } from './common';
import { returnValueTestSchema } from './return-value-test';

export const JsonConditionType = 'json';

export const jsonConditionSchema = baseConditionSchema.extend({
  conditionType: z.literal(JsonConditionType).default(JsonConditionType),
  data: z.any().describe('The JSON data to evaluate. Can be an object, array, primitive value, or JSON string.'),
  query: jsonPathSchema.optional().describe('Optional JSONPath query to extract a specific value from the data.'),
  returnValueTest: returnValueTestSchema,
});

export type JsonConditionProps = z.infer<typeof jsonConditionSchema>;
