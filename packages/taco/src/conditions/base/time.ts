import { Condition } from '../condition';
import {
  TimeConditionProps,
  timeConditionSchema,
  TimeConditionType,
} from '../schemas/time';
import { OmitConditionType } from '../shared';

export {
  TimeConditionMethod,
  TimeConditionProps,
  timeConditionSchema,
  TimeConditionType,
} from '../schemas/time';

export class TimeCondition extends Condition {
  constructor(value: OmitConditionType<TimeConditionProps>) {
    super(timeConditionSchema, {
      conditionType: TimeConditionType,
      ...value,
    });
  }
}
