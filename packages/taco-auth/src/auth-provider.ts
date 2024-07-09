import { AuthSignature } from './auth-sig';
import { EIP4361AuthProvider, EIP712AuthProvider } from './providers';

/**
 * @deprecated Use EIP4361_AUTH_METHOD instead.
 */
export const EIP712_AUTH_METHOD = 'EIP712';
export const EIP4361_AUTH_METHOD = 'EIP4361';


export interface AuthProvider {
  getOrCreateAuthSignature(): Promise<AuthSignature>;
}

export type AuthProviders = {
  [EIP712_AUTH_METHOD]?: EIP712AuthProvider;
  [EIP4361_AUTH_METHOD]?: EIP4361AuthProvider;
  // Fallback to satisfy type checking
  [key: string]: AuthProvider | undefined;
};

export const USER_ADDRESS_PARAM_DEFAULT = ':userAddress';
export const USER_ADDRESS_PARAM_EIP712 = `:userAddress${EIP712_AUTH_METHOD}`;
export const USER_ADDRESS_PARAM_EIP4361 = `:userAddress${EIP4361_AUTH_METHOD}`;

export const AUTH_METHOD_FOR_PARAM: Record<string, string> = {
  [USER_ADDRESS_PARAM_DEFAULT]: EIP4361_AUTH_METHOD,
  [USER_ADDRESS_PARAM_EIP712]: EIP712_AUTH_METHOD,
  [USER_ADDRESS_PARAM_EIP4361]: EIP4361_AUTH_METHOD,
};
