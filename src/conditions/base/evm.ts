import Joi from 'joi';

import { ETH_ADDRESS_REGEXP, SUPPORTED_CHAINS } from '../const';

import { Condition } from './condition';
import { returnValueTestSchema } from './schema';

export const STANDARD_CONTRACT_TYPES = ['ERC20', 'ERC721'];

const functionAbiVariable = Joi.object({
  internalType: Joi.string().required(),
  name: Joi.string().required(),
  type: Joi.string().required(),
});

const functionAbiSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string().valid('function').required(),
  inputs: Joi.array().items(functionAbiVariable),
  outputs: Joi.array().items(functionAbiVariable),
  // TODO: Should we restrict this to 'view'?
  // stateMutability: Joi.string().valid('view').required(),
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

export class EvmCondition extends Condition {
  public readonly schema = Joi.object({
    contractAddress: Joi.string().pattern(ETH_ADDRESS_REGEXP).required(),
    chain: Joi.number()
      .valid(...SUPPORTED_CHAINS)
      .required(),
    standardContractType: Joi.string()
      .valid(...STANDARD_CONTRACT_TYPES)
      .optional(),
    functionAbi: functionAbiSchema.optional(),
    method: Joi.string().required(),
    parameters: Joi.array().required(),
    returnValueTest: returnValueTestSchema,
  })
    // At most one of these keys needs to be present
    .xor('standardContractType', 'functionAbi');
}
