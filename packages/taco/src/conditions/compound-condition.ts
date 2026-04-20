import { Condition, ConditionProps } from './condition.js';
import {
  CompoundConditionProps,
  compoundConditionSchema,
  CompoundConditionType,
} from './schemas/compound.js';
import { OmitConditionType } from './shared.js';

export {
  CompoundConditionProps,
  compoundConditionSchema,
  CompoundConditionType,
} from './schemas/compound.js';

export type ConditionOrProps = Condition | ConditionProps;

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
