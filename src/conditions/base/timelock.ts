import Joi from 'joi';

import { Condition, makeReturnValueTest } from './condition';

export class TimelockCondition extends Condition {
  defaults = {
    method: 'timelock',
  };

  public readonly schema = Joi.object({
    returnValueTest: makeReturnValueTest(),
    method: Joi.string().valid('timelock').required(),
  });
}
