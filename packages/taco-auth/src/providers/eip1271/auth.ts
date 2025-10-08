import { z } from 'zod';

import { baseAuthSignatureSchema } from '../../auth-sig.js';

export const EIP1271_AUTH_METHOD = 'EIP1271';

export const EIP1271TypedDataSchema = z.object({
  chain: z.number().int().nonnegative(),
  dataHash: z.string().startsWith('0x'), // hex string
});

export const eip1271AuthSignatureSchema = baseAuthSignatureSchema.extend({
  scheme: z.literal(EIP1271_AUTH_METHOD),
  typedData: EIP1271TypedDataSchema,
});

export type EIP1271AuthSignature = z.infer<typeof eip1271AuthSignatureSchema>;
