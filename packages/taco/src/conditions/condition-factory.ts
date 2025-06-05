import {
  AddressAllowlistCondition,
  AddressAllowlistConditionProps,
  AddressAllowlistConditionType,
} from './base/address-allowlist';
import {
  ContractCondition,
  ContractConditionProps,
  ContractConditionType,
} from './base/contract';
import {
  JsonApiCondition,
  JsonApiConditionProps,
  JsonApiConditionType,
} from './base/json-api';
import {
  JsonRpcCondition,
  JsonRpcConditionProps,
  JsonRpcConditionType,
} from './base/json-rpc';
import { JWTCondition, JWTConditionProps, JWTConditionType } from './base/jwt';
import { RpcCondition, RpcConditionProps, RpcConditionType } from './base/rpc';
import {
  TimeCondition,
  TimeConditionProps,
  TimeConditionType,
} from './base/time';
import {
  CompoundCondition,
  CompoundConditionProps,
  CompoundConditionType,
} from './compound-condition';
import { Condition, ConditionProps } from './condition';
import {
  IfThenElseCondition,
  IfThenElseConditionProps,
  IfThenElseConditionType,
} from './if-then-else-condition';
import {
  SequentialCondition,
  SequentialConditionProps,
  SequentialConditionType,
} from './sequential';

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
      case AddressAllowlistConditionType:
        return new AddressAllowlistCondition(
          props as AddressAllowlistConditionProps,
        );
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
