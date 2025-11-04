import { Condition } from '../condition.js';
import {
  TimeConditionProps,
  timeConditionSchema,
  TimeConditionType,
} from '../schemas/time.js';
import { OmitConditionType } from '../shared.js';

export {
  TimeConditionMethod,
  TimeConditionProps,
  timeConditionSchema,
  TimeConditionType,
} from '../schemas/time.js';

export class TimeCondition extends Condition {
  constructor(value: OmitConditionType<TimeConditionProps>) {
    super(timeConditionSchema, {
      conditionType: TimeConditionType,
      ...value,
    });
  }
}
