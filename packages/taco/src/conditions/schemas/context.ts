import { z } from 'zod';

import { CONTEXT_PARAM_FULL_MATCH_REGEXP } from '../const';

import { plainStringSchema } from './common';

const UINT256_MAX = BigInt(
  '115792089237316195423570985008687907853269984665640564039457584007913129639935',
);
const INT256_MIN = BigInt(
  '-57896044618658097711785492504343953926634992332820282019728792003956564819968',
);

export const contextParamSchema = z
  .string()
  .regex(CONTEXT_PARAM_FULL_MATCH_REGEXP)
  .describe(
    `A Context Parameter i.e. a placeholder used within conditions and specified at the encryption time, whose value is provided at decryption time.`,
  );

const paramSchema = z.union([
  plainStringSchema,
  z.boolean(),
  z.number(),
  z.bigint(),
]);

const blockchainIntegerSchema = z
  .union([z.number().int(), z.bigint()])
  .refine((val) => {
    if (val > UINT256_MAX) {
      return false;
    } else if (val < INT256_MIN) {
      return false;
    }
    return true;
  })
  .describe('Numbers and BigInts must be in the range [-2^255, 2^256-1]).');

const blockchainParamSchema = z
  .union([plainStringSchema, z.boolean(), blockchainIntegerSchema])
  .describe(
    'Blockchain-compatible non-floating point parameter used for blockchain RPC API calls and Smart Contracts functions.',
  );

export const paramOrContextParamSchema: z.ZodSchema = z.union([
  paramSchema,
  contextParamSchema,
  z.lazy(() => z.array(paramOrContextParamSchema)),
]);

export const blockchainParamOrContextParamSchema: z.ZodSchema = z.union([
  blockchainParamSchema,
  contextParamSchema,
  z.lazy(() => z.array(blockchainParamOrContextParamSchema)),
]);
