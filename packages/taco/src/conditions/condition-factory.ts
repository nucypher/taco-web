import {
  ContractCondition,
  ContractConditionProps,
  ContractConditionType,
} from './base/contract.js';
import {
  JsonApiCondition,
  JsonApiConditionProps,
  JsonApiConditionType,
} from './base/json-api.js';
import {
  JsonRpcCondition,
  JsonRpcConditionProps,
  JsonRpcConditionType,
} from './base/json-rpc.js';
import { JWTCondition, JWTConditionProps, JWTConditionType } from './base/jwt.js';
import { RpcCondition, RpcConditionProps, RpcConditionType } from './base/rpc.js';
import {
  TimeCondition,
  TimeConditionProps,
  TimeConditionType,
} from './base/time.js';
import {
  CompoundCondition,
  CompoundConditionProps,
  CompoundConditionType,
} from './compound-condition.js';
import { Condition, ConditionProps } from './condition.js';
import {
  IfThenElseCondition,
  IfThenElseConditionProps,
  IfThenElseConditionType,
} from './if-then-else-condition.js';
import {
  SequentialCondition,
  SequentialConditionProps,
  SequentialConditionType,
} from './sequential.js';

const ERR_INVALID_CONDITION_TYPE = (type: string) =>
  `Invalid condition type: ${type}`;

export class ConditionFactory {
  public static conditionFromProps(props: ConditionProps): Condition {
    switch (props.conditionType) {
      // Base Conditions
      case RpcConditionType:
        return new RpcCondition(props as RpcConditionProps);
      case TimeConditionType:
        return new TimeCondition(props as TimeConditionProps);
      case ContractConditionType:
        return new ContractCondition(props as ContractConditionProps);
      case JsonApiConditionType:
        return new JsonApiCondition(props as JsonApiConditionProps);
      case JsonRpcConditionType:
        return new JsonRpcCondition(props as JsonRpcConditionProps);
      case JWTConditionType:
        return new JWTCondition(props as JWTConditionProps);
      // Logical Conditions
      case CompoundConditionType:
        return new CompoundCondition(props as CompoundConditionProps);
      case SequentialConditionType:
        return new SequentialCondition(props as SequentialConditionProps);
      case IfThenElseConditionType:
        return new IfThenElseCondition(props as IfThenElseConditionProps);
      default:
        throw new Error(ERR_INVALID_CONDITION_TYPE(props.conditionType));
    }
  }
}
