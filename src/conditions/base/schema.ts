import Joi from 'joi';

import { ETH_ADDRESS_REGEXP, USER_ADDRESS_PARAM } from '../const';

const COMPARATORS = ['==', '>', '<', '>=', '<=', '!='];

export interface ReturnValueTestConfig {
  index?: number;
  comparator: string;
  value: string | number;
}

export const returnValueTestSchema: Joi.ObjectSchema<ReturnValueTestConfig> =
  Joi.object({
    index: Joi.number().optional(),
    comparator: Joi.string()
      .valid(...COMPARATORS)
      .required(),
    value: Joi.alternatives(Joi.string(), Joi.number()).required(),
  });

export const ethAddressOrUserAddressSchema = Joi.alternatives(
  Joi.string().pattern(ETH_ADDRESS_REGEXP),
  USER_ADDRESS_PARAM
);
