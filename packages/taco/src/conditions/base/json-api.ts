import { z } from 'zod';

import { Condition } from '../condition';
import {
  EthAddressOrUserAddressSchema,
  OmitConditionType,
  paramOrContextParamSchema,
  returnValueTestSchema,
} from '../shared';

export const JsonApiConditionType = 'json';

export const JsonApiConditionSchema = z.object({
  conditionType: z.literal(JsonApiConditionType).default(JsonApiConditionType),
  parameters: z.union([
    z.array(EthAddressOrUserAddressSchema).nonempty(),
    // Using tuple here because ordering matters
    z.tuple([EthAddressOrUserAddressSchema, paramOrContextParamSchema]),
  ]),
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
