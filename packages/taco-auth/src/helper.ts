import { ethers } from 'ethers';

import { AuthProviders, EIP4361_AUTH_METHOD, EIP712_AUTH_METHOD } from './auth-provider';
import {
  EIP4361AuthProvider,
  EIP4361AuthProviderParams,
  EIP712AuthProvider,
} from './providers';

export const makeAuthProviders = (
  provider: ethers.providers.Provider,
  signer?: ethers.Signer,
  siweDefaultParams?: EIP4361AuthProviderParams,
): AuthProviders => {
  return {
    [EIP712_AUTH_METHOD]: signer ? new EIP712AuthProvider(provider, signer) : undefined,
    [EIP4361_AUTH_METHOD]: signer ? new EIP4361AuthProvider(provider, signer, siweDefaultParams) : undefined,
  } as AuthProviders;
};
