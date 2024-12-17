import { Condition } from '../condition';
import {
  JsonApiConditionProps,
  jsonApiConditionSchema,
  JsonApiConditionType,
} from '../schemas/json-api';
import { OmitConditionType } from '../shared';

export {
  JsonApiConditionProps,
  jsonApiConditionSchema,
  JsonApiConditionType,
} from '../schemas/json-api';

export class JsonApiCondition extends Condition {
  constructor(value: OmitConditionType<JsonApiConditionProps>) {
    super(jsonApiConditionSchema, {
      conditionType: JsonApiConditionType,
      ...value,
    });
  }
}
