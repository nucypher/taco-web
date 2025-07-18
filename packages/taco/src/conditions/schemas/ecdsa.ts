import { z } from 'zod';

import { baseConditionSchema, hexStringSchema } from './common';
import { contextParamSchema } from './context';

export const ECDSA_MESSAGE_PARAM_DEFAULT = ':ecdsaMessage';
export const ECDSA_SIGNATURE_PARAM_DEFAULT = ':ecdsaSignature';

export const ECDSAConditionType = 'ecdsa';

// Supported ECDSA curves (must match Python backend format)
export const SUPPORTED_ECDSA_CURVES = [
  // NIST curves
  'NIST192p',
  'NIST224p',
  'NIST256p',
  'NIST384p',
  'NIST521p',
  // SECP curves
  'SECP112r1',
  'SECP112r2',
  'SECP128r1',
  'SECP160r1',
  'SECP256k1',
  // Brainpool curves (r-variants)
  'BRAINPOOLP160r1',
  'BRAINPOOLP192r1',
  'BRAINPOOLP224r1',
  'BRAINPOOLP256r1',
  'BRAINPOOLP320r1',
  'BRAINPOOLP384r1',
  'BRAINPOOLP512r1',
  // Brainpool curves (t-variants)
  'BRAINPOOLP160t1',
  'BRAINPOOLP192t1',
  'BRAINPOOLP224t1',
  'BRAINPOOLP256t1',
  'BRAINPOOLP320t1',
  'BRAINPOOLP384t1',
  'BRAINPOOLP512t1',
  // Edwards curves
  'Ed25519',
  'Ed448',
] as const;

export type ECDSACurve = typeof SUPPORTED_ECDSA_CURVES[number];

export const DEFAULT_ECDSA_CURVE: ECDSACurve = 'SECP256k1';

export const ecdsaConditionSchema = baseConditionSchema.extend({
  conditionType: z.literal(ECDSAConditionType).default(ECDSAConditionType),
  message: z.union([
    z.string(),
    contextParamSchema,
  ]).default(ECDSA_MESSAGE_PARAM_DEFAULT),
  signature: z.union([
    hexStringSchema,
    contextParamSchema,
  ]).default(ECDSA_SIGNATURE_PARAM_DEFAULT),
  curve: z.enum(SUPPORTED_ECDSA_CURVES).default(DEFAULT_ECDSA_CURVE),
});

export type ECDSAConditionProps = z.infer<typeof ecdsaConditionSchema>; 