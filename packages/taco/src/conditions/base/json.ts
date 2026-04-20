import { Condition } from '../condition.js';
import {
  JsonConditionProps,
  jsonConditionSchema,
  JsonConditionType,
} from '../schemas/json.js';
import { OmitConditionType } from '../shared.js';

export {
  JsonConditionProps,
  jsonConditionSchema,
  JsonConditionType,
} from '../schemas/json.js';

export class JsonCondition extends Condition {
  constructor(value: OmitConditionType<JsonConditionProps>) {
    super(jsonConditionSchema, {
      conditionType: JsonConditionType,
      ...value,
    });
  }
}
