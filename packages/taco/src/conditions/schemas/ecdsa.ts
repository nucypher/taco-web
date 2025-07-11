import { z } from 'zod';

import { baseConditionSchema } from './common';
import { contextParamSchema } from './context';

export const ECDSA_MESSAGE_PARAM_DEFAULT = ':ecdsaMessage';
export const ECDSA_SIGNATURE_PARAM_DEFAULT = ':ecdsaSignature';

export const ECDSAConditionType = 'ecdsa';

// Supported ECDSA curves (must match Python backend format)
export const SUPPORTED_ECDSA_CURVES = [
  'SECP256k1',
  'NIST256p',
  'NIST384p', 
  'NIST521p',
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
    z.string().regex(/^[0-9a-fA-F]+$/, 'Signature must be a valid hex string'),
    contextParamSchema,
  ]).default(ECDSA_SIGNATURE_PARAM_DEFAULT),
  verifyingKey: z.union([
    z.string().regex(/^[0-9a-fA-F]+$/, 'Verifying key must be a valid hex string'),
    contextParamSchema,
  ]),
  curve: z.enum(SUPPORTED_ECDSA_CURVES).default(DEFAULT_ECDSA_CURVE),
});

export type ECDSAConditionProps = z.infer<typeof ecdsaConditionSchema>; 