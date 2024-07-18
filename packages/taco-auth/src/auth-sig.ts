import { EthAddressSchema } from '@nucypher/shared';
import { z } from 'zod';

import {
  EIP4361_AUTH_METHOD,
  EIP4361TypedDataSchema,
} from './providers/eip4361/common';

export const authSignatureSchema = z.object({
  signature: z.string(),
  address: EthAddressSchema,
  scheme: z.enum([EIP4361_AUTH_METHOD]),
  typedData: EIP4361TypedDataSchema,
});

export type AuthSignature = z.infer<typeof authSignatureSchema>;
