import { Condition, ConditionProps } from './condition';
import {
  CompoundConditionProps,
  compoundConditionSchema,
  CompoundConditionType,
} from './schemas/compound';
import { OmitConditionType } from './shared';

export {
  CompoundConditionProps,
  compoundConditionSchema,
  CompoundConditionType,
} from './schemas/compound';

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
