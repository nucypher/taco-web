import Joi from 'joi';

import { RpcCondition, rpcConditionSchema } from './rpc';

const BLOCKTIME_METHOD = 'blocktime';

const timeConditionSchema = {
  ...rpcConditionSchema,
  method: Joi.string().valid(BLOCKTIME_METHOD).required(),
};

export class TimeCondition extends RpcCondition {
  public readonly defaults: Record<string, unknown> = {
    method: BLOCKTIME_METHOD,
  };

  public readonly schema = Joi.object(timeConditionSchema);
}
