import { BlockIdentifierSchema, EthAddressSchema } from '@nucypher/shared';
import { z } from 'zod';

import { baseConditionSchema, UserAddressSchema } from './common.js';
import { contextParamSchema } from './context.js';
import { blockchainReturnValueTestSchema } from './return-value-test.js';

export const RpcConditionType = 'rpc';

const EthAddressOrContextVariableSchema = z.union([
  EthAddressSchema,
  UserAddressSchema,
  contextParamSchema,
]);
const BlockOrContextParamSchema = z
  .union([BlockIdentifierSchema, contextParamSchema])
  .describe(
    'A block identifier or a context variable that will be replaced with a block identifier at execution time.',
  );

// eth_getBalance schema specification
// - Ethereum spec: https://ethereum.github.io/execution-apis/api-documentation/
// - web3py: https://web3py.readthedocs.io/en/stable/web3.eth.html#web3.eth.Eth.get_balance
export const rpcConditionSchema = baseConditionSchema
  .extend({
    conditionType: z.literal(RpcConditionType).default(RpcConditionType),
    chain: z.number().int().nonnegative(),
    method: z
      .enum(['eth_getBalance'])
      .describe("Only 'eth_getBalance' method is supported"),
    parameters: z.union([
      // Spec requires 2 parameters: an address and a block identifier
      z
        .tuple([EthAddressOrContextVariableSchema, BlockOrContextParamSchema])
        .describe(
          'Spec requires 2 parameters - an address and a block identifier',
        ),
      z
        .tuple([EthAddressOrContextVariableSchema])
        .describe(
          "Block identifier, which defaults to 'latest' if not specified",
        ),
    ]),
    returnValueTest: blockchainReturnValueTestSchema, // Update to allow multiple return values after expanding supported methods
  })
  .describe(
    'RPC Condition for calling [Ethereum JSON RPC APIs](https://ethereum.github.io/execution-apis/api-documentation/)',
  );

export type RpcConditionProps = z.infer<typeof rpcConditionSchema>;
