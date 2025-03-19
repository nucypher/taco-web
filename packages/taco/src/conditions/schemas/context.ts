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

const nonFloatParamSchema = z
  .union([plainStringSchema, z.boolean(), z.number().int()])
  .describe(
    'Non-floating point (string, boolean, or integer). Used for parameters passed to blockchain RPC endpoints and Smart Contracts functions',
  );

export const paramOrContextParamSchema: z.ZodSchema = z.union([
  paramSchema,
  contextParamSchema,
  z.lazy(() => z.array(paramOrContextParamSchema)),
]);

export const nonFloatParamOrContextParamSchema: z.ZodSchema = z.union([
  nonFloatParamSchema,
  contextParamSchema,
  z.lazy(() => z.array(nonFloatParamOrContextParamSchema)),
]);
