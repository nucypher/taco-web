import Joi from 'joi';

import { omit } from '../../utils';

import { RpcCondition, rpcConditionRecord } from './rpc';

export const BLOCKTIME_METHOD = 'blocktime';

export const timeConditionRecord: Record<string, Joi.Schema> = {
  // TimeCondition is an RpcCondition with the method set to 'blocktime' and no parameters
  ...omit(rpcConditionRecord, ['parameters']),
  method: Joi.string().valid(BLOCKTIME_METHOD).required(),
};

export const timeConditionSchema = Joi.object(timeConditionRecord);

export class TimeCondition extends RpcCondition {
  public readonly defaults: Record<string, unknown> = {
    method: BLOCKTIME_METHOD,
  };

  public readonly schema = timeConditionSchema;
}
