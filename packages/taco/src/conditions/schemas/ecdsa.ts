import { z } from 'zod';

import { baseConditionSchema, hexStringSchema } from './common';

export const ECDSA_MESSAGE_PARAM_DEFAULT = ':message';
export const ECDSA_SIGNATURE_PARAM_DEFAULT = ':signature';

export const ECDSAConditionType = 'ecdsa';

// Allowed context parameters for ECDSA message field - ONLY :message
const ecdsaMessageContextParamSchema = z.enum([
  ':message',
]).describe('Context parameter for ECDSA message - only :message is allowed');

// Allowed context parameters for ECDSA signature field - ONLY :signature
const ecdsaSignatureContextParamSchema = z.enum([
  ':signature',
]).describe('Context parameter for ECDSA signature - only :signature is allowed');

// Message field that properly validates context parameters
const ecdsaMessageSchema = z.string().superRefine((val, ctx) => {
  if (val.startsWith(':')) {
    // It's a context parameter, validate against allowed values
    const result = ecdsaMessageContextParamSchema.safeParse(val);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_enum_value,
        options: [':message'],
        received: val,
        message: `Invalid context parameter for message. Only ':message' is allowed.`,
      });
    }
  }
  // Otherwise it's a regular string, which is valid
});

// Signature field that properly validates context parameters
const ecdsaSignatureSchema = z.string().superRefine((val, ctx) => {
  if (val.startsWith(':')) {
    // It's a context parameter, validate against allowed values
    const result = ecdsaSignatureContextParamSchema.safeParse(val);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_enum_value,
        options: [':signature'],
        received: val,
        message: `Invalid context parameter for signature. Only ':signature' is allowed.`,
      });
    }
  } else {
    // It's not a context parameter, validate as hex string
    const result = hexStringSchema.safeParse(val);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_string,
        validation: 'regex',
        message: 'Invalid hex string',
      });
    }
  }
});

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

export const ecdsaConditionSchema = baseConditionSchema.extend({
  conditionType: z.literal(ECDSAConditionType).default(ECDSAConditionType),
  message: ecdsaMessageSchema.default(ECDSA_MESSAGE_PARAM_DEFAULT),
  signature: ecdsaSignatureSchema.default(ECDSA_SIGNATURE_PARAM_DEFAULT),
  curve: z.enum(SUPPORTED_ECDSA_CURVES),
});

export type ECDSAConditionProps = z.infer<typeof ecdsaConditionSchema>; 