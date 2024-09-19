import { z } from 'zod';

import { contractConditionSchema } from './base/contract';
import { rpcConditionSchema } from './base/rpc';
import { timeConditionSchema } from './base/time';
import { compoundConditionSchema } from './compound-condition';
import { sequentialConditionSchema } from './sequential';

export const commonConditionSchema: z.ZodSchema = z.lazy(() =>
  z.union([
    rpcConditionSchema,
    timeConditionSchema,
    contractConditionSchema,
    compoundConditionSchema,
    sequentialConditionSchema,
  ]),
);
