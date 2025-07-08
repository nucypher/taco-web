import { z } from 'zod';

import {
  baseConditionSchema,
  httpsURLSchema,
  jsonAuthorizationTypeSchema,
  jsonPathSchema,
} from './common';
import { contextParamSchema } from './context';
import { returnValueTestSchema } from './return-value-test';

export const JsonApiConditionType = 'json-api';

export const jsonApiConditionSchema = baseConditionSchema
  .extend({
    conditionType: z
      .literal(JsonApiConditionType)
      .default(JsonApiConditionType),
    endpoint: httpsURLSchema,
    parameters: z.record(z.string(), z.unknown()).optional(),
    query: jsonPathSchema.optional(),
    authorizationToken: contextParamSchema.optional(),
    authorizationType: jsonAuthorizationTypeSchema.optional(),
    returnValueTest: returnValueTestSchema, // Update to allow multiple return values after expanding supported methods
  })
  .refine(
    (data) => {
      // Ensure that if authorizationType is provided, then authorizationToken is set
      if (data.authorizationType && !data.authorizationToken) {
        return false;
      }
      return true;
    },
    {
      message:
        'authorizationToken must be provided if authorizationType is set',
      path: ['authorizationType'],
    },
  );

export type JsonApiConditionProps = z.infer<typeof jsonApiConditionSchema>;
