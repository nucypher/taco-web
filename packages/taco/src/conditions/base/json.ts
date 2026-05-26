import { Condition } from '../condition';
import {
  JsonConditionProps,
  jsonConditionSchema,
  JsonConditionType,
} from '../schemas/json';
import { OmitConditionType } from '../shared';

export {
  JsonConditionProps,
  jsonConditionSchema,
  JsonConditionType,
} from '../schemas/json';

export class JsonCondition extends Condition {
  constructor(value: OmitConditionType<JsonConditionProps>) {
    super(jsonConditionSchema, {
      conditionType: JsonConditionType,
      ...value,
    });
  }
}
