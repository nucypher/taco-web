import Joi from 'joi';

import { SUPPORTED_CHAINS } from '../const';

import { Condition } from './condition';
import {
  ethAddressOrUserAddressSchema,
  returnValueTestSchema,
} from './return-value';

const rpcMethodSchemas: Record<string, Joi.Schema> = {
  eth_getBalance: Joi.array().items(ethAddressOrUserAddressSchema).required(),
  balanceOf: Joi.array().items(ethAddressOrUserAddressSchema).required(),
};

const makeParameters = () =>
  Joi.array().when('method', {
    switch: Object.keys(rpcMethodSchemas).map((method) => ({
      is: method,
      then: rpcMethodSchemas[method],
    })),
  });

export const rpcConditionRecord = {
  chain: Joi.number()
    .valid(...SUPPORTED_CHAINS)
    .required(),
  method: Joi.string()
    .valid(...Object.keys(rpcMethodSchemas))
    .required(),
  parameters: makeParameters(),
  returnValueTest: returnValueTestSchema.required(),
};

export const rpcConditionSchema = Joi.object(rpcConditionRecord);

export class RpcCondition extends Condition {
  public readonly schema = rpcConditionSchema;
}
