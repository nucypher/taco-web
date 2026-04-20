import { Condition } from '../condition.js';
import {
  ECDSAConditionProps,
  ecdsaConditionSchema,
  ECDSAConditionType,
} from '../schemas/ecdsa.js';
import { OmitConditionType } from '../shared.js';

export {
  ECDSA_MESSAGE_PARAM_DEFAULT,
  ECDSA_SIGNATURE_PARAM_DEFAULT,
  ECDSAConditionProps,
  ecdsaConditionSchema,
  ECDSAConditionType,
  ECDSACurve,
  SUPPORTED_ECDSA_CURVES,
} from '../schemas/ecdsa.js';

export class ECDSACondition extends Condition {
  constructor(value: OmitConditionType<ECDSAConditionProps>) {
    super(ecdsaConditionSchema, {
      conditionType: ECDSAConditionType,
      ...value,
    });
  }
}
