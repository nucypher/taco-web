import { Condition } from '../condition';
import {
  ECDSAConditionProps,
  ecdsaConditionSchema,
  ECDSAConditionType,
} from '../schemas/ecdsa';
import { OmitConditionType } from '../shared';

export {
  DEFAULT_ECDSA_CURVE,
  ECDSACurve,
  ECDSA_MESSAGE_PARAM_DEFAULT,
  ECDSA_SIGNATURE_PARAM_DEFAULT,
  ECDSAConditionProps,
  ecdsaConditionSchema,
  ECDSAConditionType,
  SUPPORTED_ECDSA_CURVES,
} from '../schemas/ecdsa';

export class ECDSACondition extends Condition {
  constructor(value: OmitConditionType<ECDSAConditionProps>) {
    super(ecdsaConditionSchema, {
      conditionType: ECDSAConditionType,
      ...value,
    });
  }
} 