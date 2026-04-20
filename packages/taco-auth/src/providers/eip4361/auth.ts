import { SiweMessage } from 'siwe';
import { z } from 'zod';

import { baseAuthSignatureSchema } from '../../auth-sig.js';

export const EIP4361_AUTH_METHOD = 'EIP4361';

export const USER_ADDRESS_PARAM_DEFAULT = ':userAddress';

const isSiweMessage = (message: string): boolean => {
  try {
    new SiweMessage(message);
    return true;
  } catch {
    return false;
  }
};

export const EIP4361TypedDataSchema = z
  .string()
  .refine(isSiweMessage, { message: 'Invalid SIWE message' });

export const eip4361AuthSignatureSchema = baseAuthSignatureSchema.extend({
  scheme: z.literal(EIP4361_AUTH_METHOD),
  typedData: EIP4361TypedDataSchema,
});

export type EIP4361AuthSignature = z.infer<typeof eip4361AuthSignatureSchema>;
