import { Condition } from './condition.js';
import {
  IfThenElseConditionProps,
  ifThenElseConditionSchema,
  IfThenElseConditionType,
} from './schemas/if-then-else.js';
import { OmitConditionType } from './shared.js';

export {
  IfThenElseConditionProps,
  ifThenElseConditionSchema,
  IfThenElseConditionType,
} from './schemas/if-then-else.js';

export class IfThenElseCondition extends Condition {
  constructor(value: OmitConditionType<IfThenElseConditionProps>) {
    super(ifThenElseConditionSchema, {
      conditionType: IfThenElseConditionType,
      ...value,
    });
  }
}
