import { EthAddressSchema } from '@nucypher/shared';
import { z } from 'zod';

import {
  EIP4361_AUTH_METHOD,
  EIP4361TypedDataSchema,
} from './providers/eip4361/common';
import {
  ENCRYPTOR_SELF_DELEGATE_AUTH_METHOD,
  SelfDelegateTypedDataSchema,
} from './providers/encryptor/self-delegate';

// TODO: Create two different schemas, rather than one with different field schemas
export const authSignatureSchema = z.object({
  signature: z.string(),
  address: EthAddressSchema,
  scheme: z.enum([EIP4361_AUTH_METHOD, ENCRYPTOR_SELF_DELEGATE_AUTH_METHOD]),
  typedData: z.union([EIP4361TypedDataSchema, SelfDelegateTypedDataSchema]),
});

export type AuthSignature = z.infer<typeof authSignatureSchema>;
