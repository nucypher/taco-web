import { Condition } from '../condition.js';
import {
  JWTConditionProps,
  jwtConditionSchema,
  JWTConditionType,
} from '../schemas/jwt.js';
import { OmitConditionType } from '../shared.js';

export {
  JWT_PARAM_DEFAULT,
  JWTConditionProps,
  jwtConditionSchema,
  JWTConditionType,
} from '../schemas/jwt.js';

export class JWTCondition extends Condition {
  constructor(value: OmitConditionType<JWTConditionProps>) {
    super(jwtConditionSchema, {
      conditionType: JWTConditionType,
      ...value,
    });
  }
}
