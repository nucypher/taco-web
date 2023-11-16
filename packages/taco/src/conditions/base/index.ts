import {
  CompoundConditionProps,
  compoundConditionSchema,
  CompoundConditionType,
} from '../compound-condition';
import { Condition, ConditionProps } from '../condition';

import {
  ContractConditionProps,
  contractConditionSchema,
  ContractConditionType,
} from './contract';
import { RpcConditionProps, rpcConditionSchema, RpcConditionType } from './rpc';
import {
  TimeConditionProps,
  timeConditionSchema,
  TimeConditionType,
} from './time';

type OmitConditionType<T> = Omit<T, 'conditionType'>;

// Exporting classes here instead of their respective schema files to
// avoid circular dependency on Condition class.

type ConditionOrProps = Condition | ConditionProps;

export class CompoundCondition extends Condition {
  constructor(value: OmitConditionType<CompoundConditionProps>) {
    super(compoundConditionSchema, {
      conditionType: CompoundConditionType,
      ...value,
    });
  }

  private static withOperator(
    operands: ConditionOrProps[],
    operator: 'or' | 'and' | 'not',
  ): CompoundCondition {
    const asObjects = operands.map((operand) => {
      if (operand instanceof Condition) {
        return operand.toObj();
      }
      return operand;
    });
    return new CompoundCondition({
      operator,
      operands: asObjects,
    });
  }

  public static or(conditions: ConditionOrProps[]): CompoundCondition {
    return CompoundCondition.withOperator(conditions, 'or');
  }

  public static and(conditions: ConditionOrProps[]): CompoundCondition {
    return CompoundCondition.withOperator(conditions, 'and');
  }

  public static not(condition: ConditionOrProps): CompoundCondition {
    return CompoundCondition.withOperator([condition], 'not');
  }
}

export class ContractCondition extends Condition {
  constructor(value: OmitConditionType<ContractConditionProps>) {
    super(contractConditionSchema, {
      conditionType: ContractConditionType,
      ...value,
    });
  }
}

export class RpcCondition extends Condition {
  constructor(value: OmitConditionType<RpcConditionProps>) {
    super(rpcConditionSchema, {
      conditionType: RpcConditionType,
      ...value,
    });
  }
}

export class TimeCondition extends Condition {
  constructor(value: OmitConditionType<TimeConditionProps>) {
    super(timeConditionSchema, {
      conditionType: TimeConditionType,
      ...value,
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
export { TimeConditionType, type TimeConditionProps } from './time';
