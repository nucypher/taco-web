import { Condition } from './condition';
import {
  IfThenElseConditionProps,
  ifThenElseConditionSchema,
  IfThenElseConditionType,
} from './schemas/if-then-else';
import { OmitConditionType } from './shared';

export {
  IfThenElseConditionProps,
  ifThenElseConditionSchema,
  IfThenElseConditionType,
} from './schemas/if-then-else';

export class IfThenElseCondition extends Condition {
  constructor(value: OmitConditionType<IfThenElseConditionProps>) {
    super(ifThenElseConditionSchema, {
      conditionType: IfThenElseConditionType,
      ...value,
    });
  }
}
