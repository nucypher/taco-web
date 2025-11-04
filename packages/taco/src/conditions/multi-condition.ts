import { CompoundConditionType } from './compound-condition.js';
import { ConditionProps } from './condition.js';
import { IfThenElseConditionType } from './if-then-else-condition.js';
import { ConditionVariableProps, SequentialConditionType } from './sequential.js';

export const maxNestedDepth =
  (maxDepth: number) =>
  (condition: ConditionProps, currentDepth = 1): boolean => {
    if (
      condition.conditionType === CompoundConditionType ||
      condition.conditionType === SequentialConditionType ||
      condition.conditionType === IfThenElseConditionType
    ) {
      if (currentDepth > maxDepth) {
        // no more multi-condition types allowed at this level
        return false;
      }

      if (condition.conditionType === CompoundConditionType) {
        return condition.operands.every((child: ConditionProps) =>
          maxNestedDepth(maxDepth)(child, currentDepth + 1),
        );
      } else if (condition.conditionType === SequentialConditionType) {
        return condition.conditionVariables.every(
          (child: ConditionVariableProps) =>
            maxNestedDepth(maxDepth)(child.condition, currentDepth + 1),
        );
      } else {
        // if-then-else condition
        const ifThenElseConditions = [];
        ifThenElseConditions.push(condition.ifCondition);
        ifThenElseConditions.push(condition.thenCondition);
        if (typeof condition.elseCondition !== 'boolean') {
          ifThenElseConditions.push(condition.elseCondition);
        }
        return ifThenElseConditions.every((child: ConditionProps) =>
          maxNestedDepth(maxDepth)(child, currentDepth + 1),
        );
      }
    }

    return true;
  };
