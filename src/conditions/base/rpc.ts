import Joi, { Schema } from 'joi';

import {
  ETH_ADDRESS_REGEXP,
  SUPPORTED_CHAINS,
  USER_ADDRESS_PARAM,
} from '../const';

import { Condition, makeReturnValueTest } from './condition';

export interface RpcConditionConfig {
  CONDITION_TYPE: string;
  RPC_METHODS: string[];
  PARAMETERS_PER_METHOD: Record<string, string[]>;
}

export const RpcConditionConfig: RpcConditionConfig = {
  CONDITION_TYPE: 'rpc',
  RPC_METHODS: ['eth_getBalance', 'balanceOf'],
  PARAMETERS_PER_METHOD: {
    eth_getBalance: ['address'],
    balanceOf: ['address'],
  },
};

export const ethAddressOrUserAddress = Joi.alternatives().try(
  Joi.string().pattern(ETH_ADDRESS_REGEXP),
  USER_ADDRESS_PARAM,
);

export const getAddressSchema = () =>
  Joi.array().items(ethAddressOrUserAddress).required();

export const rpcMethodSchema = RpcConditionConfig.RPC_METHODS.reduce(
  (acc, method) => {
    if (RpcConditionConfig.PARAMETERS_PER_METHOD[method].includes('address')) {
      acc[method] = getAddressSchema();
    } else {
      acc[method] = Joi.array().items(Joi.string()).required();
    }
    return acc;
  },
  {} as Record<string, Schema>,
);

export class RpcCondition extends Condition {
  public readonly schema = Joi.object({
    chain: Joi.number()
      .valid(...SUPPORTED_CHAINS)
      .required(),
    method: Joi.string()
      .valid(...RpcConditionConfig.RPC_METHODS)
      .required(),
    parameters: Joi.when('method', {
      switch: RpcConditionConfig.RPC_METHODS.map((method) => ({
        is: method,
        then: rpcMethodSchema[method],
      })),
    }),
    returnValueTest: makeReturnValueTest(),
  });
}
