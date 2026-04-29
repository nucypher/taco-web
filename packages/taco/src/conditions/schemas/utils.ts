import { z } from 'zod';

import { compoundConditionSchema } from '../compound-condition.js';

import { contextVariableConditionSchema } from './context-variable.js';
import { contractConditionSchema } from './contract.js';
import { ecdsaConditionSchema } from './ecdsa.js';
import { ifThenElseConditionSchema } from './if-then-else.js';
import { jsonApiConditionSchema } from './json-api.js';
import { jsonRpcConditionSchema } from './json-rpc.js';
import { jsonConditionSchema } from './json.js';
import { jwtConditionSchema } from './jwt.js';
import { rpcConditionSchema } from './rpc.js';
import { sequentialConditionSchema } from './sequential.js';
import {
  signingObjectAbiAttributeConditionSchema,
  signingObjectAttributeConditionSchema,
} from './signing.js';
import { timeConditionSchema } from './time.js';

export const anyConditionSchema: z.ZodSchema = z.lazy(() =>
  z.union([
    rpcConditionSchema,
    timeConditionSchema,
    contextVariableConditionSchema,
    contractConditionSchema,
    ecdsaConditionSchema,
    jsonConditionSchema,
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
