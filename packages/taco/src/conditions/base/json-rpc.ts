import { Condition } from '../condition.js';
import {
  JsonRpcConditionProps,
  jsonRpcConditionSchema,
  JsonRpcConditionType,
} from '../schemas/json-rpc.js';
import { OmitConditionType } from '../shared.js';

export {
  JsonRpcConditionProps,
  jsonRpcConditionSchema,
  JsonRpcConditionType,
} from '../schemas/json-rpc.js';

export class JsonRpcCondition extends Condition {
  constructor(value: OmitConditionType<JsonRpcConditionProps>) {
    super(jsonRpcConditionSchema, {
      conditionType: JsonRpcConditionType,
      ...value,
    });
  }
}
