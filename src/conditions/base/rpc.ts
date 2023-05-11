import Joi from 'joi';

import { Condition } from '../condition';
import { SUPPORTED_CHAINS, USER_ADDRESS_PARAM } from '../const';

export const RpcConditionConfig = {
  CONDITION_TYPE: 'rpc',
  RPC_METHODS: ['eth_getBalance', 'balanceOf'],
  PARAMETERS_PER_METHOD: {
    eth_getBalance: ['address'],
    balanceOf: ['address'],
  },
  CONTEXT_PARAMETERS_PER_METHOD: {
    eth_getBalance: [USER_ADDRESS_PARAM],
    balanceOf: [USER_ADDRESS_PARAM],
  },
};

export class RpcCondition extends Condition {
  public readonly schema = Joi.object({
    chain: Joi.number()
      .valid(...SUPPORTED_CHAINS)
      .required(),
    method: Joi.string()
      .valid(...RpcConditionConfig.RPC_METHODS)
      .required(),
    parameters: Joi.array().required(),
    returnValueTest: this.makeReturnValueTest(),
  });

  public getContextParameters = (): string[] => {
    const asObject = this.toObj();

    const method = asObject['method'] as string;
    const parameters = (asObject['parameters'] ?? []) as string[];

    const context: string[] =
      RpcConditionConfig.CONTEXT_PARAMETERS_PER_METHOD[
        method as keyof typeof RpcConditionConfig.CONTEXT_PARAMETERS_PER_METHOD
      ];
    const returnValueTest = asObject['returnValueTest'] as Record<
      string,
      string
    >;

    const maybeParams = [...(context ?? []), returnValueTest['value']];
    return parameters.filter((p) => maybeParams.includes(p));
  };
}
