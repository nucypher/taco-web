import { z } from 'zod';

import { ETH_ADDRESS_REGEXP, USER_ADDRESS_PARAM } from '../const';
import { CONTEXT_PARAM_PREFIX } from '../context/context';

export const ContextParamSchema = z.string().startsWith(CONTEXT_PARAM_PREFIX);
export const ParamSchema = z.union([z.number(), z.string(), z.boolean()]);
export const ParamOrContextParamSchema = z.union([
  ParamSchema,
  ContextParamSchema,
]);

export const returnValueTestSchema = z.object({
  index: z.number().optional(),
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
