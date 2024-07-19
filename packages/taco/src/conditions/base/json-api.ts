import { z } from 'zod';

import { Condition } from '../condition';
import {
  OmitConditionType,
  returnValueTestSchema,
} from '../shared';

export const JsonApiConditionType = 'json-api';

export const JsonApiConditionSchema = z.object({
  conditionType: z.literal(JsonApiConditionType).default(JsonApiConditionType),
  endpoint: z.string().url(),
  parameters: z.record(z.string(), z.unknown()),
  query: z.string(),
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
