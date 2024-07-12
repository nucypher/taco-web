import { EthAddressSchema } from '@nucypher/shared';
import { z } from 'zod';

import { EIP4361_AUTH_METHOD } from './auth-provider';
import { EIP4361TypedDataSchema } from './providers';

export const authSignatureSchema = z.object({
  signature: z.string(),
  address: EthAddressSchema,
  scheme: z.enum([EIP4361_AUTH_METHOD]),
  typedData: EIP4361TypedDataSchema,
});

export type AuthSignature = z.infer<typeof authSignatureSchema>;
