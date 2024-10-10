import { CompoundConditionType } from './compound-condition';
import { ConditionProps } from './condition';
import { ConditionVariableProps, SequentialConditionType } from './sequential';

export const maxNestedDepth =
  (maxDepth: number) =>
  (condition: ConditionProps, currentDepth = 1) => {
    if (
      condition.conditionType === CompoundConditionType ||
      condition.conditionType === SequentialConditionType
    ) {
      if (currentDepth > maxDepth) {
        // no more multi-condition types allowed at this level
        return false;
      }

      if (condition.conditionType === CompoundConditionType) {
        return condition.operands.every((child: ConditionProps) =>
          maxNestedDepth(maxDepth)(child, currentDepth + 1),
        );
      } else {
        return condition.conditionVariables.every(
          (child: ConditionVariableProps) =>
            maxNestedDepth(maxDepth)(child.condition, currentDepth + 1),
        );
      }
    }

    return true;
  };
