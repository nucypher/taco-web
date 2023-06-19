import Joi from 'joi';

import { ETH_ADDRESS_REGEXP } from '../const';

import { RpcCondition, rpcConditionRecord } from './rpc';

export const STANDARD_CONTRACT_TYPES = ['ERC20', 'ERC721'];

const functionAbiVariable = Joi.object({
  internalType: Joi.string(), // TODO is this needed?
  name: Joi.string().required(),
  type: Joi.string().required(),
});

const functionAbiSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('function').required(),
  inputs: Joi.array().items(functionAbiVariable),
  outputs: Joi.array().items(functionAbiVariable),
  // TODO: Should we restrict this to 'view'?
  stateMutability: Joi.string(),
}).custom((functionAbi, helper) => {
  // Validate method name
  const method = helper.state.ancestors[0].method;
  if (functionAbi.name !== method) {
    return helper.message({
      custom: '"method" must be the same as "functionAbi.name"',
    });
  }

  // Validate nr of parameters
  const parameters = helper.state.ancestors[0].parameters;
  if (functionAbi.inputs?.length !== parameters.length) {
    return helper.message({
      custom: '"parameters" must have the same length as "functionAbi.inputs"',
    });
  }

  return functionAbi;
});

export const contractConditionRecord: Record<string, Joi.Schema> = {
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
