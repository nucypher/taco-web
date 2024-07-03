import { ethers } from 'ethers';
import { generateNonce, SiweMessage } from 'siwe';
import { z } from 'zod';

import { EIP4361_AUTH_METHOD } from '../auth-provider';
import { AuthSignature } from '../auth-sig';
import { LocalStorage } from '../storage';

const isSiweMessage = (message: string): boolean => {
  try {
    new SiweMessage(message);
    return true;
  } catch {
    return false;
  }
};

export const EIP4361TypedDataSchema = z.string()
  .refine(isSiweMessage, { message: 'Invalid SIWE message' });

export type EIP4361AuthProviderParams = {
  domain: string;
  uri: string;
}

const ERR_MISSING_SIWE_PARAMETERS = 'Missing default SIWE parameters';

export class EIP4361AuthProvider {
  private readonly storage: LocalStorage;

  constructor(
    // TODO: We only need the provider to fetch the chainId, consider removing it
    private readonly provider: ethers.providers.Provider,
    private readonly signer: ethers.Signer,
    private readonly providerParams?: EIP4361AuthProviderParams,
  ) {
    this.storage = new LocalStorage();
  }

  public async getOrCreateAuthSignature(): Promise<AuthSignature> {
    const address = await this.signer.getAddress();
    const storageKey = `eth-${EIP4361_AUTH_METHOD}-message-${address}`;

    // If we have a signature in localStorage, return it
    const maybeSignature = this.storage.getAuthSignature(storageKey);
    if (maybeSignature) {
      return maybeSignature;
    }

    // If at this point we didn't return, we need to create a new message
    const authMessage = await this.createSIWEAuthMessage();
    this.storage.setAuthSignature(storageKey, authMessage);
    return authMessage;
  }

  private async createSIWEAuthMessage(): Promise<AuthSignature> {
    const address = await this.signer.getAddress();
    const { domain, uri } = this.getParametersOrDefault();
    const version = '1';
    const nonce = generateNonce();
    const chainId = (await this.provider.getNetwork()).chainId;
    const siweMessage = new SiweMessage({
      domain,
      address,
      statement: `${domain} wants you to sign in with your Ethereum account: ${address}`,
      uri,
      version,
      nonce,
      chainId,
    });
    const scheme = 'EIP4361';
    const message = siweMessage.prepareMessage();
    const signature = await this.signer.signMessage(message);
    return { signature, address, scheme, typedData: message };
  }

  // TODO: Create a facility to set these parameters or expose them to the user
  private getParametersOrDefault(): {
    domain: string;
    uri: string;
  } {
    // If we are in a browser environment, we can get the domain and uri from the window object
    if (typeof window !== 'undefined') {
      const maybeOrigin = window?.location?.origin;
      return {
        domain: maybeOrigin.split('//')[1].split('.')[0],
        uri: maybeOrigin,
      };
    }
    if (this.providerParams) {
      return {
        domain: this.providerParams.domain,
        uri: this.providerParams.uri,
      };
    }
    throw new Error(ERR_MISSING_SIWE_PARAMETERS);
  }
}
