import { EthAddressSchema } from '@nucypher/shared';
import { z } from 'zod';

import { EIP4361_AUTH_METHOD } from './auth-provider';
import { EIP4361TypedDataSchema } from './providers';
import { SiweMessage } from 'siwe';


export const authSignatureSchema = z.object({
  signature: z.string(),
  address: EthAddressSchema,
  scheme: z.enum([EIP4361_AUTH_METHOD]),
  typedData: EIP4361TypedDataSchema,
});

export type AuthSignature = z.infer<typeof authSignatureSchema>;

// TODO: create a AuthSignature class.

// TODO: Where do we get the signature from?
export const fromSIWEMessage = (siweMessage: SiweMessage, signature: ???): AuthSignature => {
  return {
    signature: ???
    address: siweMessage.address,
    scheme: EIP4361_AUTH_METHOD,
    typedData: siweMessage.prepareMessage()
  }
}
