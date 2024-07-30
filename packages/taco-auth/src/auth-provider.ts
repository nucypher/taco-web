import { AuthSignature } from './auth-sig';
import { EIP4361AuthProvider } from './providers';

export const EIP4361_AUTH_METHOD = 'EIP4361';

export interface AuthProvider {
  getOrCreateAuthSignature(): Promise<AuthSignature>;
}

export type AuthProviders = {
  [EIP4361_AUTH_METHOD]?: EIP4361AuthProvider;
  // Fallback to satisfy type checking
  [key: string]: AuthProvider | undefined;
};

export const USER_ADDRESS_PARAM_DEFAULT = ':userAddress';

export const AUTH_METHOD_FOR_PARAM: Record<string, string> = {
  [USER_ADDRESS_PARAM_DEFAULT]: EIP4361_AUTH_METHOD,
};
