import { Condition } from '../condition';
import {
  ContextVariableConditionProps,
  contextVariableConditionSchema,
  ContextVariableConditionType,
} from '../schemas/context-variable';
import { OmitConditionType } from '../shared';

export { ContextVariableConditionProps, ContextVariableConditionType };

/**
 * A condition that checks if a context variable matches one of the expected values.
 * Supports case-insensitive comparisons.
 */
export class ContextVariableCondition extends Condition {
  constructor(value: OmitConditionType<ContextVariableConditionProps>) {
    super(contextVariableConditionSchema, {
      conditionType: ContextVariableConditionType,
      ...value,
    });
  }
}