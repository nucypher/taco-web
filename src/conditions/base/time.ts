import Joi from 'joi';

import { SUPPORTED_CHAINS } from '../const';

import { Condition } from './condition';
import { returnValueTestSchema } from './schema';

export class TimeCondition extends Condition {
  // TODO: This is the only condition that uses defaults, and also the only condition that uses `method` in order
  //   to determine the schema. I.e. the only method that used `METHOD = 'blocktime'` in `nucypher/nucypher`.
  // TODO: Consider introducing a different field for this, e.g. `conditionType` or `type`. Use this field in a
  //  condition factory.
  public readonly defaults: Record<string, unknown> = {
    method: 'blocktime',
  };

  public readonly schema = Joi.object({
    method: Joi.string().valid(this.defaults.method).required(),
    returnValueTest: returnValueTestSchema.required(),
    chain: Joi.number()
      .valid(...SUPPORTED_CHAINS)
      .required(),
  });
}
