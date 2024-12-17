import { z } from 'zod';

import { baseConditionSchema, jsonPathSchema } from './common';
import { contextParamSchema } from './context';
import { returnValueTestSchema } from './return-value-test';

export const JsonApiConditionType = 'json-api';

export const jsonApiConditionSchema = baseConditionSchema.extend({
  conditionType: z.literal(JsonApiConditionType).default(JsonApiConditionType),
  endpoint: z.string().url(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  query: jsonPathSchema.optional(),
  authorizationToken: contextParamSchema.optional(),
  returnValueTest: returnValueTestSchema, // Update to allow multiple return values after expanding supported methods
});

export type JsonApiConditionProps = z.infer<typeof jsonApiConditionSchema>;
