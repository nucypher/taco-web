import { EthAddressSchema } from '@nucypher/shared';
import { z } from 'zod';

import { EIP4361_AUTH_METHOD, EIP712_AUTH_METHOD } from './auth-provider';
import { EIP4361TypedDataSchema, EIP712TypedDataSchema } from './providers';


export const authSignatureSchema = z.object({
  signature: z.string(),
  address: EthAddressSchema,
  scheme: z.enum([EIP712_AUTH_METHOD, EIP4361_AUTH_METHOD]),
  typedData: z.union([
    EIP4361TypedDataSchema,
    // TODO(#536): Remove post EIP712 deprecation
    EIP712TypedDataSchema,
  ]),
});

export type AuthSignature = z.infer<typeof authSignatureSchema>;
