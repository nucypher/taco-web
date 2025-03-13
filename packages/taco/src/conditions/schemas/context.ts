import { z } from 'zod';

import { CONTEXT_PARAM_FULL_MATCH_REGEXP } from '../const';

import { plainStringSchema } from './common';

export const contextParamSchema = z
  .string()
  .regex(CONTEXT_PARAM_FULL_MATCH_REGEXP)
  .describe(
    `A Context Parameter i.e. a placeholder used within conditions and specified at the encryption time, whose value is provided at decryption time.`,
  );

const paramSchema = z.union([plainStringSchema, z.boolean(), z.number()]);

const rpcParamSchema = z
  .union([plainStringSchema, z.boolean(), z.number().int()])
  .describe(
    'Used for EVM RPC parameters and Smart Contract function parameters',
  );

export const paramOrContextParamSchema: z.ZodSchema = z.union([
  paramSchema,
  contextParamSchema,
  z.lazy(() => z.array(paramOrContextParamSchema)),
]);

export const rpcParamOrContextParamSchema: z.ZodSchema = z.union([
  rpcParamSchema,
  contextParamSchema,
  z.lazy(() => z.array(rpcParamOrContextParamSchema)),
]);
