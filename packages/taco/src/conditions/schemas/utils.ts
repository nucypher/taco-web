import { z } from 'zod';

import { compoundConditionSchema } from '../compound-condition';

import { contractConditionSchema } from './contract';
import { rpcConditionSchema } from './rpc';
import { sequentialConditionSchema } from './sequential';
import { timeConditionSchema } from './time';

export const anyConditionSchema: z.ZodSchema = z.lazy(() =>
  z.union([
    rpcConditionSchema,
    timeConditionSchema,
    contractConditionSchema,
    compoundConditionSchema,
    sequentialConditionSchema,
  ]),
);
