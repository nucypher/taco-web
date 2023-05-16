import Joi from 'joi';

import { SUPPORTED_CHAINS } from '../const';

import { Condition } from './condition';
import { ethAddressOrUserAddressSchema, returnValueTestSchema } from './schema';

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

export class RpcCondition extends Condition {
  public readonly schema = Joi.object({
    chain: Joi.number()
      .valid(...SUPPORTED_CHAINS)
      .required(),
    method: Joi.string()
      .valid(...Object.keys(rpcMethodSchemas))
      .required(),
    parameters: makeParameters(),
    returnValueTest: returnValueTestSchema,
  });
}
