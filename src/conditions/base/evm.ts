import Joi from 'joi';

import { Condition, makeReturnValueTest } from '../condition';
import {
  ETH_ADDRESS_REGEXP,
  SUPPORTED_CHAINS,
  USER_ADDRESS_PARAM,
} from '../const';
import { ContextParametersHandlerMixin } from '../context/mixin';

export interface EvmConditionConfig {
  CONDITION_TYPE: string;
  STANDARD_CONTRACT_TYPES: string[];
  METHODS_PER_CONTRACT_TYPE: Record<string, string[]>;
  PARAMETERS_PER_METHOD: Record<string, string[]>;
  CONTEXT_PARAMETERS_PER_METHOD: Record<string, string[]>;
}

export const EvmConditionConfig: EvmConditionConfig = {
  CONDITION_TYPE: 'evm',
  STANDARD_CONTRACT_TYPES: ['ERC20', 'ERC721'],
  METHODS_PER_CONTRACT_TYPE: {
    ERC20: ['balanceOf'],
    ERC721: ['balanceOf', 'ownerOf'],
  },
  PARAMETERS_PER_METHOD: {
    balanceOf: ['address'],
    ownerOf: ['tokenId'],
  },
  CONTEXT_PARAMETERS_PER_METHOD: {
    balanceOf: [USER_ADDRESS_PARAM],
    ownerOf: [USER_ADDRESS_PARAM],
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

export class EvmConditionBase extends Condition {
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

export const EvmCondition = ContextParametersHandlerMixin(EvmConditionBase);

Object.defineProperty(EvmCondition.prototype, 'getContextConfig', {
  value: () => EvmConditionConfig.CONTEXT_PARAMETERS_PER_METHOD,
});
