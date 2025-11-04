import { z } from 'zod';

import { compoundConditionSchema } from '../compound-condition.js';

import { contractConditionSchema } from './contract.js';
import { ifThenElseConditionSchema } from './if-then-else.js';
import { jsonApiConditionSchema } from './json-api.js';
import { jsonRpcConditionSchema } from './json-rpc.js';
import { jwtConditionSchema } from './jwt.js';
import { rpcConditionSchema } from './rpc.js';
import { sequentialConditionSchema } from './sequential.js';
import { timeConditionSchema } from './time.js';

export const anyConditionSchema: z.ZodSchema = z.lazy(() =>
  z.union([
    rpcConditionSchema,
    timeConditionSchema,
    contractConditionSchema,
    compoundConditionSchema,
    jsonApiConditionSchema,
    jsonRpcConditionSchema,
    jwtConditionSchema,
    sequentialConditionSchema,
    ifThenElseConditionSchema,
  ]),
);
