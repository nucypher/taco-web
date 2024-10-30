import { JSONPath } from '@astronautlabs/jsonpath';
import { z } from 'zod';

import { CONTEXT_PARAM_REGEXP } from '../const';

import { contextParamSchema } from './context';
import { returnValueTestSchema } from './return-value-test';

export const JsonApiConditionType = 'json-api';

const validateJSONPath = (jsonPath: string): boolean => {
  // account for embedded context variables
  if (CONTEXT_PARAM_REGEXP.test(jsonPath)) {
    // skip validation
    return true;
  }

  try {
    JSONPath.parse(jsonPath);
    return true;
  } catch (error) {
    return false;
  }
};

export const jsonPathSchema = z
  .string()
  .refine((val) => validateJSONPath(val), {
    message: 'Invalid JSONPath expression',
  });

export const jsonApiConditionSchema = z.object({
  conditionType: z.literal(JsonApiConditionType).default(JsonApiConditionType),
  endpoint: z.string().url(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  query: jsonPathSchema.optional(),
  authorizationToken: contextParamSchema.optional(),
  returnValueTest: returnValueTestSchema, // Update to allow multiple return values after expanding supported methods
});

export type JsonApiConditionProps = z.infer<typeof jsonApiConditionSchema>;
