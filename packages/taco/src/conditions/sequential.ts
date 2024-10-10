import { Condition } from './condition';
import {
  SequentialConditionProps,
  sequentialConditionSchema,
  SequentialConditionType,
} from './schemas/sequential';
import { OmitConditionType } from './shared';

export {
  ConditionVariableProps,
  SequentialConditionProps,
  sequentialConditionSchema,
  SequentialConditionType,
} from './schemas/sequential';

export class SequentialCondition extends Condition {
  constructor(value: OmitConditionType<SequentialConditionProps>) {
    super(sequentialConditionSchema, {
      conditionType: SequentialConditionType,
      ...value,
    });
  }
}
