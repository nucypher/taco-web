import { EthAddressSchema } from '@nucypher/shared';
import { z } from 'zod';

import { EIP1271AuthSignature } from './providers/eip1271/auth.js';
import { EIP4361AuthSignature } from './providers/eip4361/auth.js';

export const baseAuthSignatureSchema = z.object({
  signature: z.string(),
  address: EthAddressSchema,
  scheme: z.string(),
  typedData: z.unknown(),
});

export type AuthSignature = EIP4361AuthSignature | EIP1271AuthSignature;
