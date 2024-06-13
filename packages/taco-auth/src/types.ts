import {EIP4361SignatureProvider, FormattedEIP4361} from './eip4361';
import {EIP712SignatureProvider, FormattedEIP712} from './eip712';

// TODO: Use a generic AuthProvider interface
export type EIP712AuthProvider = EIP712SignatureProvider;
export type EIP4361AuthProvider = EIP4361SignatureProvider;

export type AuthProvider = EIP712AuthProvider | EIP4361AuthProvider;

export type AuthProviders = {
  [EIP712_AUTH_METHOD]?: EIP712AuthProvider;
  [EIP4361_AUTH_METHOD]?: EIP4361AuthProvider;
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
