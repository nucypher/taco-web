import {EIP4361AuthProvider, FormattedEIP4361} from './providers/eip4361';
import {EIP712AuthProvider, FormattedEIP712} from './providers/eip712';

export interface AuthProvider {
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

export const EIP712_AUTH_METHOD = 'EIP712';
export const EIP4361_AUTH_METHOD = 'EIP4361';

export const USER_ADDRESS_PARAM_DEFAULT = ':userAddress';
export const USER_ADDRESS_PARAM_EIP712 = `:userAddress${EIP712_AUTH_METHOD}`;
export const USER_ADDRESS_PARAM_EIP4361 = `:userAddress${EIP4361_AUTH_METHOD}`;

export const AUTH_METHOD_FOR_PARAM: Record<string, string> = {
  [USER_ADDRESS_PARAM_DEFAULT]: EIP712_AUTH_METHOD,
  [USER_ADDRESS_PARAM_EIP712]: EIP712_AUTH_METHOD,
  [USER_ADDRESS_PARAM_EIP4361]: EIP4361_AUTH_METHOD,
};
