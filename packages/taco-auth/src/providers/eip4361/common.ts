import { SiweMessage } from 'siwe';
import { z } from 'zod';

export const EIP4361_AUTH_METHOD = 'EIP4361';

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
