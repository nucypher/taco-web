import {ethers} from "ethers";

import { EIP4361AuthProvider, EIP4361AuthProviderParams } from './providers/eip4361';
import { EIP712AuthProvider } from './providers/eip712';
import { AuthProviders, EIP4361_AUTH_METHOD, EIP712_AUTH_METHOD } from './types';

export const makeAuthProviders = (
  provider: ethers.providers.Provider,
  signer?: ethers.Signer,
  siweDefaultParams?: EIP4361AuthProviderParams
): AuthProviders => {
  return {
    [EIP712_AUTH_METHOD]: signer ? new EIP712AuthProvider(provider, signer) : undefined,
    [EIP4361_AUTH_METHOD]: signer ? new EIP4361AuthProvider(provider, signer, siweDefaultParams) : undefined
  } as AuthProviders;
};
