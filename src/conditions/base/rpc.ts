import { z } from 'zod';

import { SUPPORTED_CHAIN_IDS } from '../const';
import createUnionSchema from '../zod';

import { EthAddressOrUserAddressSchema, returnValueTestSchema } from './shared';

export const rpcConditionSchema = z.object({
  conditionType: z.literal('rpc').default('rpc'),
  chain: createUnionSchema(SUPPORTED_CHAIN_IDS),
  method: z.enum(['eth_getBalance', 'balanceOf']),
  parameters: z.array(EthAddressOrUserAddressSchema),
  returnValueTest: returnValueTestSchema,
});

export type RpcConditionProps = z.infer<typeof rpcConditionSchema>;
