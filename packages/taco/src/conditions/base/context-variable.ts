import { Condition } from '../condition';
import {
  ContextVariableConditionProps,
  contextVariableConditionSchema,
  ContextVariableConditionType,
} from '../schemas/context-variable';
import { OmitConditionType } from '../shared';

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
