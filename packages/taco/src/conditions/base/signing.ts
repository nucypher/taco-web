import { Condition } from '../condition';
import {
  SigningObjectAttributeConditionProps,
  signingObjectAttributeConditionSchema,
  SigningObjectAttributeConditionType,
} from '../schemas/signing';
import { OmitConditionType } from '../shared';

export {
  SigningObjectAttributeConditionProps,
  signingObjectAttributeConditionSchema,
  SigningObjectAttributeConditionType,
} from '../schemas/signing';

export class SigningObjectAttributeCondition extends Condition {
  constructor(value: OmitConditionType<SigningObjectAttributeConditionProps>) {
    super(signingObjectAttributeConditionSchema, {
      conditionType: SigningObjectAttributeConditionType,
      ...value,
    });
  }
}
