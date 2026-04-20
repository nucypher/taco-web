import { Condition } from '../condition.js';
import {
  RpcConditionProps,
  rpcConditionSchema,
  RpcConditionType,
} from '../schemas/rpc.js';
import { OmitConditionType } from '../shared.js';

export {
  RpcConditionProps,
  rpcConditionSchema,
  RpcConditionType,
} from '../schemas/rpc.js';

export class RpcCondition extends Condition {
  constructor(value: OmitConditionType<RpcConditionProps>) {
    super(rpcConditionSchema, {
      conditionType: RpcConditionType,
      ...value,
    });
  }
}
