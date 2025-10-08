import { Condition } from './condition.js';
import {
  SequentialConditionProps,
  sequentialConditionSchema,
  SequentialConditionType,
} from './schemas/sequential.js';
import { OmitConditionType } from './shared.js';

export {
  ConditionVariableProps,
  SequentialConditionProps,
  sequentialConditionSchema,
  SequentialConditionType,
} from './schemas/sequential.js';

export class SequentialCondition extends Condition {
  constructor(value: OmitConditionType<SequentialConditionProps>) {
    super(sequentialConditionSchema, {
      conditionType: SequentialConditionType,
      ...value,
    });
  }
}
