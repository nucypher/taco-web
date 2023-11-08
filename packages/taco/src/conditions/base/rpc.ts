import { z } from 'zod';

import { SUPPORTED_CHAIN_IDS } from '../const';
import createUnionSchema from '../zod';

import {
  EthAddressOrUserAddressSchema,
  ParamOrContextParamSchema,
  returnValueTestSchema,
} from './shared';

export const RpcConditionType = 'rpc';

export const rpcConditionSchema = z.object({
  conditionType: z.literal(RpcConditionType).default(RpcConditionType),
  chain: createUnionSchema(SUPPORTED_CHAIN_IDS),
  method: z.enum(['eth_getBalance']),
  parameters: z.union([
    z.array(EthAddressOrUserAddressSchema).nonempty(),
    // Using tuple here because ordering matters
    z.tuple([EthAddressOrUserAddressSchema, ParamOrContextParamSchema]),
  ]),
  returnValueTest: returnValueTestSchema,
});

export type RpcConditionProps = z.infer<typeof rpcConditionSchema>;
