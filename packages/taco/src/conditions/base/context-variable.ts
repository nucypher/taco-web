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
 * Supports various comparison operators like ==, >, <, >=, <=, !=, in, !in.
 */
export class ContextVariableCondition extends Condition {
  constructor(value: OmitConditionType<ContextVariableConditionProps>) {
    super(contextVariableConditionSchema, {
      conditionType: ContextVariableConditionType,
      ...value,
    });
  }
}