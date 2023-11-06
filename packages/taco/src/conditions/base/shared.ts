import { z } from 'zod';

import {
  CONTEXT_PARAM_REGEXP,
  ETH_ADDRESS_REGEXP,
  USER_ADDRESS_PARAM,
} from '../const';

export const ContextParamSchema = z.string().regex(CONTEXT_PARAM_REGEXP);
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
