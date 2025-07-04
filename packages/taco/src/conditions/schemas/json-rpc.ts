import { z } from 'zod';

import {
  baseConditionSchema,
  httpsURLSchema,
  jsonAuthorizationTypeSchema,
  jsonPathSchema,
} from './common';
import { contextParamSchema } from './context';
import { returnValueTestSchema } from './return-value-test';

export const JsonRpcConditionType = 'json-rpc';

export const jsonRpcConditionSchema = baseConditionSchema
  .extend({
    conditionType: z
      .literal(JsonRpcConditionType)
      .default(JsonRpcConditionType),
    endpoint: httpsURLSchema,
    method: z.string(),
    // list or dictionary
    params: z
      .union([z.array(z.unknown()), z.record(z.string(), z.unknown())])
      .optional(),
    query: jsonPathSchema.optional(),
    authorizationToken: contextParamSchema.optional(),
    authorizationType: jsonAuthorizationTypeSchema.optional(),
    returnValueTest: returnValueTestSchema,
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

export type JsonRpcConditionProps = z.infer<typeof jsonRpcConditionSchema>;
