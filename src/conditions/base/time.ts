import Joi from 'joi';

import { omit } from '../../utils';

import { RpcCondition, rpcConditionSchema } from './rpc';

const BLOCKTIME_METHOD = 'blocktime';

const timeConditionSchema = {
  // TimeCondition is an RpcCondition with the method set to 'blocktime' and no parameters
  ...omit(rpcConditionSchema, ['parameters']),
  method: Joi.string().valid(BLOCKTIME_METHOD).required(),
};

export class TimeCondition extends RpcCondition {
  public readonly defaults: Record<string, unknown> = {
    method: BLOCKTIME_METHOD,
  };

  public readonly schema = Joi.object(timeConditionSchema);
}
