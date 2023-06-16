import { ethers } from 'ethers';
import Joi from 'joi';

import { ETH_ADDRESS_REGEXP } from '../const';

import { RpcCondition, rpcConditionRecord } from './rpc';

export const STANDARD_CONTRACT_TYPES = ['ERC20', 'ERC721'];

const functionAbiSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('function').required(),
  inputs: Joi.array(),
  outputs: Joi.array(),
  stateMutability: Joi.string().valid('view', 'pure').required(),
}).custom((functionAbi, helper) => {
  // Is `functionABI` a valid function fragment?
  let asInterface;
  try {
    asInterface = new ethers.utils.Interface([functionAbi]);
  } catch (e: unknown) {
    const { message } = e as Error;
    return helper.message({
      custom: message,
    });
  }

  if (!asInterface.fragments) {
    return helper.message({
      custom: '"functionAbi" is missing a function fragment',
    });
  }

  if (asInterface.fragments.length > 1) {
    return helper.message({
      custom: '"functionAbi" must contain exactly one function fragment',
    });
  }

  // Now we just need to validate against the parent schema
  // Validate method name
  const method = helper.state.ancestors[0].method;
  const functionFragment = asInterface.fragments.filter(
    (f) => f.name === method
  )[0];
  if (!functionFragment) {
    return helper.message({
      custom: '"functionAbi" does not contain the method specified as "method"',
    });
  }

  // Validate nr of parameters
  const parameters = helper.state.ancestors[0].parameters;
  if (functionFragment.inputs.length !== parameters.length) {
    return helper.message({
      custom: '"parameters" must have the same length as "functionAbi.inputs"',
    });
  }

  return functionAbi;
});

export const contractConditionRecord = {
  ...rpcConditionRecord,
  contractAddress: Joi.string().pattern(ETH_ADDRESS_REGEXP).required(),
  standardContractType: Joi.string()
    .valid(...STANDARD_CONTRACT_TYPES)
    .optional(),
  method: Joi.string().required(),
  functionAbi: functionAbiSchema.optional(),
  parameters: Joi.array().required(),
};

export const contractConditionSchema = Joi.object(contractConditionRecord)
  // At most one of these keys needs to be present
  .xor('standardContractType', 'functionAbi');

export class ContractCondition extends RpcCondition {
  public readonly schema = contractConditionSchema;
}
