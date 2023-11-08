import { z } from 'zod';

import {
  CONTEXT_PARAM_REGEXP,
  ETH_ADDRESS_REGEXP,
  USER_ADDRESS_PARAM
} from '../const';

export const ContextParamSchema = z.string().regex(CONTEXT_PARAM_REGEXP);
// Using unknown here because we don't know what the type of the parameter is
// It could be a string, number, boolean, an array, etc.
// We'll leave it up to the user to validate the type of the parameter.
// In the `nucypher` implementation, we use an obfuscated `fields.Raw` type to denote this.
export const ParamSchema = z.unknown();
export const ParamOrContextParamSchema = z.union([
  ParamSchema,
  ContextParamSchema,
]);

export const returnValueTestSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  comparator: z.enum(['==', '>', '<', '>=', '<=', '!=']),
  value: ParamOrContextParamSchema,
});

export type ReturnValueTestProps = z.infer<typeof returnValueTestSchema>;

const EthAddressSchema = z.string().regex(ETH_ADDRESS_REGEXP);
const UserAddressSchema = z.literal(USER_ADDRESS_PARAM);
export const EthAddressOrUserAddressSchema = z.union([
  EthAddressSchema,
  UserAddressSchema,
]);
