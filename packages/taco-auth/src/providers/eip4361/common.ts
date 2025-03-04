import { SiweMessage } from 'siwe';
import { z } from 'zod';

import { AuthSignature } from '../../auth-sig';

export const EIP4361_AUTH_METHOD = 'EIP4361';

export const USER_ADDRESS_PARAM_DEFAULT = ':userAddress';

export interface IEIP4361AuthProvider {
  getOrCreateAuthSignature(): Promise<AuthSignature>;
}

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
