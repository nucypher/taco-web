import { z } from 'zod';

import { ETH_ADDRESS_REGEXP, USER_ADDRESS_PARAM } from '../const';

export const returnValueTestSchema = z.object({
  index: z.number().optional(),
  comparator: z.enum(['==', '>', '<', '>=', '<=', '!=']),
  value: z.unknown(),
});

export type ReturnValueTestProps = z.infer<typeof returnValueTestSchema>;

const EthAddressSchema = z.string().regex(ETH_ADDRESS_REGEXP);
const UserAddressSchema = z.literal(USER_ADDRESS_PARAM);
export const EthAddressOrUserAddressSchema = z.union([
  EthAddressSchema,
  UserAddressSchema,
]);
