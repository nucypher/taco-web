import Joi from 'joi';

import { ETH_ADDRESS_REGEXP, SUPPORTED_CHAINS } from '../const';

import { makeReturnValueTest } from './condition';
import { RpcCondition } from './rpc';

export interface EvmConditionConfig {
  CONDITION_TYPE: string;
  STANDARD_CONTRACT_TYPES: string[];
  METHODS_PER_CONTRACT_TYPE: Record<string, string[]>;
  PARAMETERS_PER_METHOD: Record<string, string[]>;
}

const METHODS_PER_CONTRACT_TYPE = {
  ERC20: ['balanceOf'],
  ERC721: ['balanceOf', 'ownerOf'],
};
export const EvmConditionConfig: EvmConditionConfig = {
  CONDITION_TYPE: 'evm', // TODO: How is this used? Similar to the Timelock.defaults.method?
  STANDARD_CONTRACT_TYPES: Object.keys(METHODS_PER_CONTRACT_TYPE),
  METHODS_PER_CONTRACT_TYPE,
  PARAMETERS_PER_METHOD: {
    balanceOf: ['address'],
    ownerOf: ['tokenId'],
  },
};

// A helper method for making complex Joi types
// It says "allow these `types` when `parent` value is given"
const makeWhenGuard = (
  schema: Joi.StringSchema | Joi.ArraySchema,
  types: Record<string, string[]>,
  parent: string
) => {
  Object.entries(types).forEach(([key, value]) => {
    schema = schema.when(parent, {
      is: key,
      then: value,
    });
  });
  return schema;
};

const makeMethod = () =>
  makeWhenGuard(
    Joi.string(),
    EvmConditionConfig.METHODS_PER_CONTRACT_TYPE,
    'standardContractType'
  );

export class EvmCondition extends RpcCondition {
  public readonly schema = Joi.object({
    contractAddress: Joi.string().pattern(ETH_ADDRESS_REGEXP).required(),
    chain: Joi.string()
      .valid(...SUPPORTED_CHAINS)
      .required(),
    standardContractType: Joi.string()
      .valid(...EvmConditionConfig.STANDARD_CONTRACT_TYPES)
      .optional(),
    functionAbi: Joi.object().optional(),
    method: makeMethod().required(),
    parameters: Joi.array().required(),
    returnValueTest: makeReturnValueTest(),
  })
    // At most one of these keys needs to be present
    .xor('standardContractType', 'functionAbi');
}
