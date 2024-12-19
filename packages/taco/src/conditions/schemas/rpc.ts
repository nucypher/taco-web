import { BlockIdentifierSchema, EthAddressSchema } from '@nucypher/shared';
import { z } from 'zod';

import {
  baseConditionSchema,
  UserAddressSchema,
} from './common';
import { contextParamSchema } from './context';
import { returnValueTestSchema } from './return-value-test';

export const RpcConditionType = 'rpc';

const EthAddressOrContextVariableSchema = z.union([
  EthAddressSchema,
  UserAddressSchema,
  contextParamSchema,
]);
const BlockOrContextParamSchema = z.union([
  BlockIdentifierSchema,
  contextParamSchema,
]);

// eth_getBalance schema specification
// - Ethereum spec: https://ethereum.github.io/execution-apis/api-documentation/
// - web3py: https://web3py.readthedocs.io/en/stable/web3.eth.html#web3.eth.Eth.get_balance
export const rpcConditionSchema = baseConditionSchema.extend({
  conditionType: z.literal(RpcConditionType).default(RpcConditionType),
  chain: z.number().int().nonnegative(),
  method: z.enum(['eth_getBalance']),
  parameters: z.union([
    // Spec requires 2 parameters: an address and a block identifier
    z.tuple([EthAddressOrContextVariableSchema, BlockOrContextParamSchema]),
    // Block identifier can be omitted, since web3py (which runs on TACo exec layer) defaults to 'latest',
    z.tuple([EthAddressOrContextVariableSchema]),
  ]),
  returnValueTest: returnValueTestSchema, // Update to allow multiple return values after expanding supported methods
});

export type RpcConditionProps = z.infer<typeof rpcConditionSchema>;
