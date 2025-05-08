import { Condition } from '../condition';
import {
  RpcConditionProps,
  rpcConditionSchema,
  RpcConditionType,
} from '../schemas/rpc';
import { OmitConditionType } from '../shared';

export {
  RpcConditionProps,
  rpcConditionSchema,
  RpcConditionType,
} from '../schemas/rpc';

export class RpcCondition extends Condition {
  constructor(value: OmitConditionType<RpcConditionProps>) {
    super(rpcConditionSchema, {
      conditionType: RpcConditionType,
      ...value,
    });
  }
}
