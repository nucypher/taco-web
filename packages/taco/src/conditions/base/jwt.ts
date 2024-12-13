import { Condition } from '../condition';
import {
  JWTConditionProps,
  jwtConditionSchema,
  JWTConditionType,
} from '../schemas/jwt';
import { OmitConditionType } from '../shared';

export {
  JWT_PARAM_DEFAULT,
  JWTConditionProps,
  jwtConditionSchema,
  JWTConditionType,
} from '../schemas/jwt';

export class JWTCondition extends Condition {
  constructor(value: OmitConditionType<JWTConditionProps>) {
    super(jwtConditionSchema, {
      conditionType: JWTConditionType,
      ...value,
    });
  }
}
