import {
  CompoundConditionProps,
  compoundConditionSchema,
  CompoundConditionType,
} from '../compound-condition';
import { Condition, ConditionProps } from '../condition';

import { ContractConditionProps, contractConditionSchema } from './contract';
import { RpcConditionProps, rpcConditionSchema } from './rpc';
import { TimeConditionProps, timeConditionSchema } from './time';

// Exporting classes here instead of their respective schema files to
// avoid circular dependency on Condition class.

export class CompoundCondition extends Condition {
  constructor(value: CompoundConditionProps) {
    super(compoundConditionSchema, value);
  }

  private static withOperator(
    operands: ConditionProps[],
    operator: 'or' | 'and',
  ): CompoundCondition {
    return new CompoundCondition({
      conditionType: CompoundConditionType,
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
  constructor(value: ContractConditionProps) {
    super(contractConditionSchema, value);
  }
}

export class RpcCondition extends Condition {
  constructor(value: RpcConditionProps) {
    super(rpcConditionSchema, value);
  }
}

export class TimeCondition extends Condition {
  constructor(value: TimeConditionProps) {
    super(timeConditionSchema, value);
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
