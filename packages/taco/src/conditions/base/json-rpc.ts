import { Condition } from '../condition';
import {
  JsonRpcConditionProps,
  jsonRpcConditionSchema,
  JsonRpcConditionType,
} from '../schemas/json-rpc';
import { OmitConditionType } from '../shared';

export {
  JsonRpcConditionProps,
  jsonRpcConditionSchema,
  JsonRpcConditionType,
} from '../schemas/json-rpc';

export class JsonRpcCondition extends Condition {
  constructor(value: OmitConditionType<JsonRpcConditionProps>) {
    super(jsonRpcConditionSchema, {
      conditionType: JsonRpcConditionType,
      ...value,
    });
  }
}
