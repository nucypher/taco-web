import { EIP4361_AUTH_METHOD, EIP712_AUTH_METHOD } from '../types';

import { EIP4361AuthProvider, FormattedEIP4361 } from './eip4361';
import { EIP712AuthProvider, FormattedEIP712 } from './eip712';

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
  typedData: FormattedEIP712 | FormattedEIP4361;
}

export type AuthProvider = AuthSignatureProvider;
