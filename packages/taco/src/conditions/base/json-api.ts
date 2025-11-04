import { Condition } from '../condition.js';
import {
  JsonApiConditionProps,
  jsonApiConditionSchema,
  JsonApiConditionType,
} from '../schemas/json-api.js';
import { OmitConditionType } from '../shared.js';

export {
  JsonApiConditionProps,
  jsonApiConditionSchema,
  JsonApiConditionType,
} from '../schemas/json-api.js';

export class JsonApiCondition extends Condition {
  constructor(value: OmitConditionType<JsonApiConditionProps>) {
    super(jsonApiConditionSchema, {
      conditionType: JsonApiConditionType,
      ...value,
    });
  }
}
