import { z } from 'zod';

import { SUPPORTED_CHAIN_IDS } from '../const';

import createUnionSchema, {
  baseConditionSchema,
  EthAddressOrUserAddressSchema,
} from './common';
import { paramOrContextParamSchema } from './context';
import { returnValueTestSchema } from './return-value-test';

export const RpcConditionType = 'rpc';

export const rpcConditionSchema = baseConditionSchema.extend({
  conditionType: z.literal(RpcConditionType).default(RpcConditionType),
  chain: createUnionSchema(SUPPORTED_CHAIN_IDS),
  method: z.enum(['eth_getBalance']),
  parameters: z.union([
    z.array(EthAddressOrUserAddressSchema).nonempty(),
    // Using tuple here because ordering matters
    z.tuple([EthAddressOrUserAddressSchema, paramOrContextParamSchema]),
  ]),
  returnValueTest: returnValueTestSchema, // Update to allow multiple return values after expanding supported methods
});

export type RpcConditionProps = z.infer<typeof rpcConditionSchema>;
