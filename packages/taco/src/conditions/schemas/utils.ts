import { z } from 'zod';

import { compoundConditionSchema } from '../compound-condition';

import { contextVariableConditionSchema } from './context-variable';
import { contractConditionSchema } from './contract';
import { ecdsaConditionSchema } from './ecdsa';
import { ifThenElseConditionSchema } from './if-then-else';
import { jsonApiConditionSchema } from './json-api';
import { jsonRpcConditionSchema } from './json-rpc';
import { jwtConditionSchema } from './jwt';
import { rpcConditionSchema } from './rpc';
import { sequentialConditionSchema } from './sequential';
import {
  signingObjectAbiAttributeConditionSchema,
  signingObjectAttributeConditionSchema,
} from './signing';
import { timeConditionSchema } from './time';

export const anyConditionSchema: z.ZodSchema = z.lazy(() =>
  z.union([
    rpcConditionSchema,
    timeConditionSchema,
    contextVariableConditionSchema,
    contractConditionSchema,
    ecdsaConditionSchema,
    jsonApiConditionSchema,
    jsonRpcConditionSchema,
    jwtConditionSchema,
    signingObjectAttributeConditionSchema,
    signingObjectAbiAttributeConditionSchema,
    compoundConditionSchema,
    sequentialConditionSchema,
    ifThenElseConditionSchema,
  ]),
);
