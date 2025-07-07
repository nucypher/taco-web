import { z } from 'zod';

import { compoundConditionSchema } from '../compound-condition';


import { contractConditionSchema } from './contract';
import { ifThenElseConditionSchema } from './if-then-else';
import { jsonApiConditionSchema } from './json-api';
import { jsonRpcConditionSchema } from './json-rpc';
import { jwtConditionSchema } from './jwt';
import { rpcConditionSchema } from './rpc';
import { sequentialConditionSchema } from './sequential';
import { timeConditionSchema } from './time';
import { walletAllowlistConditionSchema } from './wallet-allowlist';

export const anyConditionSchema: z.ZodSchema = z.lazy(() =>
  z.union([
    rpcConditionSchema,
    timeConditionSchema,
    walletAllowlistConditionSchema,
    contractConditionSchema,
    compoundConditionSchema,
    jsonApiConditionSchema,
    jsonRpcConditionSchema,
    jwtConditionSchema,
    sequentialConditionSchema,
    ifThenElseConditionSchema,
  ]),
);
