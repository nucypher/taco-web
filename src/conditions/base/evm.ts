import Joi from 'joi';

import { ETH_ADDRESS_REGEXP, SUPPORTED_CHAINS } from '../const';

import { Condition } from './condition';
import { ethAddressOrUserAddressSchema, makeReturnValueTest } from './schema';

const standardContractMethods = Joi.string().when('standardContractType', {
  switch: [
    {
      is: 'ERC20',
      then: Joi.valid('balanceOf').required(),
    },
    {
      is: 'ERC721',
      then: Joi.valid('balanceOf', 'ownerOf').required(),
    },
  ],
});

const standardContractParameters = Joi.when('method', {
  switch: [
    {
      is: 'balanceOf',
      then: Joi.array()
        .length(1)
        .items(ethAddressOrUserAddressSchema)
        .required(),
    },
    {
      is: 'ownerOf',
      then: Joi.array()
        .length(1)
        .items(Joi.alternatives(Joi.number().integer().positive())),
    },
  ],
});

export class EvmCondition extends Condition {
  public readonly schema = Joi.object({
    contractAddress: Joi.string().pattern(ETH_ADDRESS_REGEXP).required(),
    chain: Joi.string()
      .valid(...SUPPORTED_CHAINS)
      .required(),
    standardContractType: Joi.string()
      .valid(...['ERC20', 'ERC721'])
      .optional(),
    functionAbi: Joi.object().optional(),
    method: Joi.string().required(),
    parameters: Joi.array().required(),
    returnValueTest: makeReturnValueTest(),
  })
    // At most one of these keys needs to be present
    .xor('standardContractType', 'functionAbi')
    // When standardContractType is present:
    .when('.standardContractType', {
      is: Joi.exist(),
      then: Joi.object({
        method: standardContractMethods,
        parameters: standardContractParameters,
      }),
    })
    // When functionAbi is present:
    .when('.functionAbi', {
      is: Joi.exist(),
      then: Joi.object({
        method: Joi.string().required(),
        parameters: Joi.array().required(),
      }),
    });
}
