import Joi from 'joi';

import { ETH_ADDRESS_REGEXP, SUPPORTED_CHAINS } from '../const';

import { Condition } from './condition';
import { returnValueTestSchema } from './schema';

export const STANDARD_CONTRACT_TYPES = ['ERC20', 'ERC721'];

export class EvmCondition extends Condition {
  public readonly schema = Joi.object({
    contractAddress: Joi.string().pattern(ETH_ADDRESS_REGEXP).required(),
    chain: Joi.string()
      .valid(...SUPPORTED_CHAINS)
      .required(),
    standardContractType: Joi.string()
      .valid(...STANDARD_CONTRACT_TYPES)
      .optional(),
    functionAbi: Joi.object().optional(),
    method: Joi.string().required(),
    parameters: Joi.array().required(),
    returnValueTest: returnValueTestSchema,
  })
    // At most one of these keys needs to be present
    .xor('standardContractType', 'functionAbi');
}
