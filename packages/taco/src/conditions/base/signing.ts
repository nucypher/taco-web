import { Condition } from '../condition';
import {
  SigningObjectAbiAttributeConditionProps,
  signingObjectAbiAttributeConditionSchema,
  SigningObjectAbiAttributeConditionType,
  SigningObjectAttributeConditionProps,
  signingObjectAttributeConditionSchema,
  SigningObjectAttributeConditionType,
} from '../schemas/signing';
import { OmitConditionType } from '../shared';

export {
  AbiCallValidationProps,
  abiCallValidationSchema,
  AbiParameterValidationProps,
  abiParameterValidationSchema,
  SIGNING_CONDITION_OBJECT_CONTEXT_VAR,
  SigningObjectAbiAttributeConditionProps,
  signingObjectAbiAttributeConditionSchema,
  SigningObjectAbiAttributeConditionType,
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

export class SigningObjectAbiAttributeCondition extends Condition {
  constructor(
    value: OmitConditionType<SigningObjectAbiAttributeConditionProps>,
  ) {
    super(signingObjectAbiAttributeConditionSchema, {
      conditionType: SigningObjectAbiAttributeConditionType,
      ...value,
    });
  }
}
