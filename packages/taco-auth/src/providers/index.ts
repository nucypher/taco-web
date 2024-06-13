import { EIP4361_AUTH_METHOD, EIP712_AUTH_METHOD } from '../types';

import { EIP4361AuthProvider, EIP4361TypedData } from './eip4361';
import { EIP712AuthProvider, EIP712TypedData } from './eip712';

export interface AuthSignatureProvider {
  getOrCreateAuthSignature(): Promise<AuthSignature>;
}

export type AuthProviders = {
  [EIP712_AUTH_METHOD]?: EIP712AuthProvider;
  [EIP4361_AUTH_METHOD]?: EIP4361AuthProvider;
  // Fallback to satisfy type checking
  [key: string]: AuthProvider | undefined;
};

export interface AuthSignature {
  signature: string;
  address: string;
  scheme: 'EIP712' | 'EIP4361';
  typedData: EIP712TypedData | EIP4361TypedData;
}

// Add other providers here
export type AuthProvider = AuthSignatureProvider;
