import { z } from 'zod';

import { ETH_ADDRESS_REGEXP, USER_ADDRESS_PARAM } from '../const';

export const returnValueTestSchema = z.object({
  index: z.number().optional(),
  comparator: z.enum(['==', '>', '<', '>=', '<=', '!=']),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export type ReturnValueTestProps = z.infer<typeof returnValueTestSchema>;

const EthAddressOrUserAddressSchema = z.array(
  z.union([z.string().regex(ETH_ADDRESS_REGEXP), z.literal(USER_ADDRESS_PARAM)])
);

export const rpcConditionSchema = z.object({
  conditionType: z.literal('rpc').default('rpc'),
  chain: z.union([
    z.literal(137),
    z.literal(80001),
    z.literal(5),
    z.literal(1),
  ]),
  method: z.enum(['eth_getBalance', 'balanceOf']),
  parameters: EthAddressOrUserAddressSchema,
  returnValueTest: returnValueTestSchema,
});

export type RpcConditionProps = z.infer<typeof rpcConditionSchema>;
