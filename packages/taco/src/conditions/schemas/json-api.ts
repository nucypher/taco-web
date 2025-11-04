import { z } from 'zod';

import { baseConditionSchema, httpsURLSchema, jsonPathSchema } from './common.js';
import { contextParamSchema } from './context.js';
import { returnValueTestSchema } from './return-value-test.js';

export const JsonApiConditionType = 'json-api';

export const jsonApiConditionSchema = baseConditionSchema.extend({
  conditionType: z.literal(JsonApiConditionType).default(JsonApiConditionType),
  endpoint: httpsURLSchema,
  parameters: z.record(z.string(), z.unknown()).optional(),
  query: jsonPathSchema.optional(),
  authorizationToken: contextParamSchema.optional(),
  returnValueTest: returnValueTestSchema, // Update to allow multiple return values after expanding supported methods
});

export type JsonApiConditionProps = z.infer<typeof jsonApiConditionSchema>;
