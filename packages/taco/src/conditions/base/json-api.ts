import { JSONPath } from 'jsonpath-plus';
import { z } from 'zod';

import { Condition } from '../condition';
import {
  OmitConditionType,
  paramOrContextParamSchema,
  returnValueTestSchema,
} from '../shared';

export const JsonApiConditionType = 'json-api';

export const JsonApiConditionSchema = z.object({
  conditionType: z.literal(JsonApiConditionType).default(JsonApiConditionType),
  endpoint: z.string().url(),
  parameters: z.array(paramOrContextParamSchema),
  query: z.string().refine(
    (path) => {
      try {
        JSONPath.toPathArray(path);
        return true;
      } catch (error) {
        return false;
      }
    },
    {
      message: "Invalid JSON path",
    }
  ),
  returnValueTest: returnValueTestSchema, // Update to allow multiple return values after expanding supported methods
});

export type JsonApiConditionProps = z.infer<typeof JsonApiConditionSchema>;

export class JsonApiCondition extends Condition {
  constructor(value: OmitConditionType<JsonApiConditionProps>) {
    super(JsonApiConditionSchema, {
      conditionType: JsonApiConditionType,
      ...value,
    });
  }
}
