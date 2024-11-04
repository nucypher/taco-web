import { ethers } from 'ethers';
import { z } from 'zod';

import { AuthSignature } from '../../auth-sig';
import { LocalStorage } from '../../storage';

export const ENCRYPTOR_SELF_DELEGATE_AUTH_METHOD = 'EncryptorSelfDelegate'

export const SelfDelegateTypedDataSchema = z.string();

export class SelfDelegateProvider {
  private readonly storage: LocalStorage;
  
  constructor(private readonly signer: ethers.Signer) {
    this.storage = new LocalStorage();
  }

  public async getOrCreateAuthSignature(
    ephemeralPublicKeyOrAddress: string
  ): Promise<AuthSignature> {
    const address = await this.signer.getAddress();
    const storageKey = `eth-${ENCRYPTOR_SELF_DELEGATE_AUTH_METHOD}-${address}-${ephemeralPublicKeyOrAddress}`;

    // If we have a signature in localStorage, return it
    const maybeSignature = this.storage.getAuthSignature(storageKey);
    if (maybeSignature) {
      // TODO: Consider design that includes freshness validation (see SIWE)
      return maybeSignature;
    }

    // If at this point we didn't return, we need to create a new message
    const authMessage = await this.createAuthMessage(ephemeralPublicKeyOrAddress);
    this.storage.setAuthSignature(storageKey, authMessage);
    return authMessage;
  }

  private async createAuthMessage(
    ephemeralPublicKeyOrAddress: string
  ): Promise<AuthSignature> {
    // TODO: Consider adding domain, uri, version, chainId (see SIWE signature)
    const address = await this.signer.getAddress();
    const scheme = ENCRYPTOR_SELF_DELEGATE_AUTH_METHOD;
    const message = ephemeralPublicKeyOrAddress;
    const signature = await this.signer.signMessage(message);
    return { signature, address, scheme, typedData: message };
  }
}
