import { z } from 'zod';

import { baseConditionSchema, hexStringSchema } from './common';
import { contextParamSchema } from './context';

export const ECDSA_MESSAGE_PARAM_DEFAULT = ':message';
export const ECDSA_SIGNATURE_PARAM_DEFAULT = ':signature';

export const ECDSAConditionType = 'ecdsa';

export const SUPPORTED_ECDSA_CURVES = [
  'SECP256k1',
  'NIST256p',
  'NIST384p',
  'NIST521p',
  'Ed25519',
  'BRAINPOOLP256r1',
] as const;

export type ECDSACurve = (typeof SUPPORTED_ECDSA_CURVES)[number];

export const ecdsaConditionSchema = baseConditionSchema
  .extend({
    conditionType: z.literal(ECDSAConditionType).default(ECDSAConditionType),
    message: z
      .union([z.string(), contextParamSchema])
      .default(ECDSA_MESSAGE_PARAM_DEFAULT),
    signature: z
      .union([hexStringSchema, contextParamSchema])
      .default(ECDSA_SIGNATURE_PARAM_DEFAULT),
    verifyingKey: hexStringSchema,
    curve: z.enum(SUPPORTED_ECDSA_CURVES),
  })
  .refine(
    (data) => {
      // ensure that if message starts with 0x that it is valid hex
      if (data.message.startsWith('0x'))
        return hexStringSchema.safeParse(data.message.slice(2)).success;
      return true;
    },
    {
      message: 'Message must be a valid hex string if it starts with "0x"',
      path: ['message'],
    },
  )
  .describe(
    'ECDSA Condition for verifying the authenticity of a message using ECDSA signatures.',
  );

export type ECDSAConditionProps = z.infer<typeof ecdsaConditionSchema>;
