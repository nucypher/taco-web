import { z } from 'zod';

import { CONTEXT_PARAM_FULL_MATCH_REGEXP } from '../const.js';

import { plainStringSchema } from './common.js';

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

const blockchainParamSchema = z
  .union([
    plainStringSchema,
    z.boolean(),
    z.number().int().safe(),
    z.bigint().lte(UINT256_MAX).gte(INT256_MIN),
  ])
  .describe(
    'Blockchain-compatible parameter values for blockchain RPC API calls and Smart Contracts functions; numbers must be in safe range and bigints must be in the range [-2^255, 2^256-1]).',
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
