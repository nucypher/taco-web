import Joi from 'joi';

import { Condition } from '../condition';

export class TimelockCondition extends Condition {
  public static readonly CONDITION_TYPE = 'timelock';

  defaults = {
    method: 'timelock',
  };

  public readonly schema = Joi.object({
    returnValueTest: this.makeReturnValueTest(),
    method: 'timelock',
  });
}
