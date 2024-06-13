import {ethers} from "ethers";

import { EIP4361SignatureProvider } from './eip4361';
import { EIP712SignatureProvider } from './eip712';
import { AuthProviders, EIP4361_AUTH_METHOD, EIP712_AUTH_METHOD } from './types';

export const makeAuthProviders = (provider: ethers.providers.Provider, signer?: ethers.Signer): AuthProviders => {
  return {
    [EIP712_AUTH_METHOD]: signer ? new EIP712SignatureProvider(provider, signer) : undefined,
    [EIP4361_AUTH_METHOD]: signer ? new EIP4361SignatureProvider(provider, signer) : undefined
  } as AuthProviders;
};
