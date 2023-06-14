import Joi from 'joi';

import { ETH_ADDRESS_REGEXP } from '../const';

import { RpcCondition, rpcConditionSchema } from './rpc';

export const STANDARD_CONTRACT_TYPES = ['ERC20', 'ERC721'];

const contractMethodSchemas: Record<string, Joi.Schema> = {
  ...rpcConditionSchema,
  contractAddress: Joi.string().pattern(ETH_ADDRESS_REGEXP).required(),
  standardContractType: Joi.string()
    .valid(...STANDARD_CONTRACT_TYPES)
    .optional(),
  method: Joi.string().required(),
  functionAbi: Joi.object().optional(),
  parameters: Joi.array().required(),
};

export class ContractCondition extends RpcCondition {
  public readonly schema = Joi.object(contractMethodSchemas)
    // At most one of these keys needs to be present
    .xor('standardContractType', 'functionAbi');
}
