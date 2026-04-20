import { Condition } from '../condition.js';
import {
  ContextVariableConditionProps,
  contextVariableConditionSchema,
  ContextVariableConditionType,
} from '../schemas/context-variable.js';
import { OmitConditionType } from '../shared.js';

export { ContextVariableConditionProps, ContextVariableConditionType };

/**
 * A condition that performs comparison operations on context variable values.
 */
export class ContextVariableCondition extends Condition {
  constructor(value: OmitConditionType<ContextVariableConditionProps>) {
    super(contextVariableConditionSchema, {
      conditionType: ContextVariableConditionType,
      ...value,
    });
  }
}
