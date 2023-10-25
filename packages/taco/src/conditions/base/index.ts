import {
  CompoundConditionProps,
  compoundConditionSchema,
  CompoundConditionType,
} from '../compound-condition';
import { Condition, ConditionProps } from '../condition';

import { ContractConditionProps, contractConditionSchema, ContractConditionType } from './contract';
import { RpcConditionProps, rpcConditionSchema, RpcConditionType } from './rpc';
import { TimeConditionProps, timeConditionSchema, TimeConditionType } from './time';

type OmitConditionType<T> = Omit<T, 'conditionType'>

// Exporting classes here instead of their respective schema files to
// avoid circular dependency on Condition class.

export class CompoundCondition extends Condition {
  constructor(value: OmitConditionType<CompoundConditionProps>) {
    super(compoundConditionSchema, {
      conditionType: CompoundConditionType,
      ...value,
    });
  }

  private static withOperator(
    operands: ConditionProps[],
    operator: 'or' | 'and',
  ): CompoundCondition {
    return new CompoundCondition({
      operator,
      operands,
    });
  }

  public static or(conditions: ConditionProps[]): CompoundCondition {
    return CompoundCondition.withOperator(conditions, 'or');
  }

  public static and(conditions: ConditionProps[]): CompoundCondition {
    return CompoundCondition.withOperator(conditions, 'and');
  }
}

export class ContractCondition extends Condition {
  constructor(value: OmitConditionType<ContractConditionProps>) {
    super(contractConditionSchema, {
      conditionType: ContractConditionType,
      ...value
    });
  }
}

export class RpcCondition extends Condition {
  constructor(value: OmitConditionType<RpcConditionProps>) {
    super(rpcConditionSchema, {
      conditionType: RpcConditionType,
      ...value
    });
  }
}

export class TimeCondition extends Condition {
  constructor(value: OmitConditionType<TimeConditionProps>) {
    super(timeConditionSchema, {
      conditionType: TimeConditionType,
      ...value
    });
  }
}

export {
  ContractConditionType,
  FunctionAbiProps,
  type ContractConditionProps,
} from './contract';
export { RpcConditionType, type RpcConditionProps } from './rpc';
export { ReturnValueTestProps } from './shared';
export {
  TimeConditionMethod,
  TimeConditionType,
  type TimeConditionProps,
} from './time';
