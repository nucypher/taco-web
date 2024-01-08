import {
  ContractCondition,
  ContractConditionProps,
  ContractConditionType,
} from './base/contract';
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

const ERR_INVALID_CONDITION_TYPE = (type: string) =>
  `Invalid condition type: ${type}`;

export class ConditionFactory {
  public static conditionFromProps(props: ConditionProps): Condition {
    switch (props.conditionType) {
      case RpcConditionType:
        return new RpcCondition(props as RpcConditionProps);
      case TimeConditionType:
        return new TimeCondition(props as TimeConditionProps);
      case ContractConditionType:
        return new ContractCondition(props as ContractConditionProps);
      case CompoundConditionType:
        return new CompoundCondition(props as CompoundConditionProps);
      default:
        throw new Error(ERR_INVALID_CONDITION_TYPE(props.conditionType));
    }
  }
}
