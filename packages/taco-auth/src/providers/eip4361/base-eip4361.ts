import { SiweMessage } from 'siwe';

import { AuthSignature } from '../../auth-sig';
import { LocalStorage } from '../../storage';

import { EIP4361_AUTH_METHOD } from './common';

export const USER_ADDRESS_PARAM_DEFAULT = ':userAddress';

export type EIP4361AuthProviderParams = {
  domain: string;
  uri: string;
};

export abstract class BaseEIP4361AuthProvider {
  private readonly storage: LocalStorage;

  public abstract getAddress(): Promise<string> | string;

  protected abstract createSIWEAuthMessage(): Promise<AuthSignature>;

  constructor() {
    this.storage = new LocalStorage();
  }

  public async getOrCreateAuthSignature(): Promise<AuthSignature> {
    const storageKey = `eth-${EIP4361_AUTH_METHOD}-message-${await this.getAddress()}`;

    // If we have a signature in localStorage, return it
    const maybeSignature = this.storage.getAuthSignature(storageKey);
    if (maybeSignature) {
      const siweMessage = new SiweMessage(maybeSignature.typedData);
      try {
        // check message validity including `expirationTime` and `notBefore`.
        await siweMessage.verify({ signature: maybeSignature.signature });
        return maybeSignature;
      } catch (e) {
        // clear signature so that it will be recreated and stored
        this.storage.clear(storageKey);
      }
    }

    // If at this point we didn't return, we need to create a new message
    const authMessage = await this.createSIWEAuthMessage();
    this.storage.setAuthSignature(storageKey, authMessage);

    return authMessage;
  }
}
