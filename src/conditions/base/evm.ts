import Joi from 'joi';

import { Condition } from '../condition';
import { SUPPORTED_CHAINS, USER_ADDRESS_PARAM } from '../const';

// A helper method for making complex Joi types
// It says "allow these `types` when `parent` value is given"
const makeGuard = (
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

export class EvmCondition extends Condition {
  public static readonly CONDITION_TYPE = 'evm';
  public static readonly STANDARD_CONTRACT_TYPES = [
    'ERC20',
    'ERC721',
    // 'ERC1155', // TODO(#131)
  ];
  public static readonly METHODS_PER_CONTRACT_TYPE: Record<string, string[]> = {
    ERC20: ['balanceOf'],
    ERC721: ['balanceOf', 'ownerOf'],
    // ERC1155: ['balanceOf'], // TODO(#131)
  };
  public static readonly PARAMETERS_PER_METHOD: Record<string, string[]> = {
    balanceOf: ['address'],
    ownerOf: ['tokenId'],
  };
  public static readonly CONTEXT_PARAMETERS_PER_METHOD: Record<
    string,
    string[]
  > = {
    balanceOf: [USER_ADDRESS_PARAM],
    ownerOf: [USER_ADDRESS_PARAM],
  };

  private makeMethod = () =>
    makeGuard(
      Joi.string(),
      EvmCondition.METHODS_PER_CONTRACT_TYPE,
      'standardContractType'
    );

  public readonly schema = Joi.object({
    contractAddress: Joi.string()
      .pattern(new RegExp('^0x[a-fA-F0-9]{40}$'))
      .required(),
    chain: Joi.string()
      .valid(...SUPPORTED_CHAINS)
      .required(),
    standardContractType: Joi.string()
      .valid(...EvmCondition.STANDARD_CONTRACT_TYPES)
      .optional(),
    functionAbi: Joi.object().optional(),
    method: this.makeMethod().required(),
    parameters: Joi.array().required(),
    returnValueTest: this.makeReturnValueTest(),
  })
    // At most one of these keys needs to be present
    .xor('standardContractType', 'functionAbi');
}
