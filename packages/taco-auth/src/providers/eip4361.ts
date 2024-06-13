import { ethers } from 'ethers';
import { generateNonce, SiweMessage } from 'siwe';

import { LocalStorage } from '../storage';
import { AuthSignature } from '../types';

export type FormattedEIP4361 = string;

export class EIP4361AuthProvider {
  private readonly storage: LocalStorage;

  constructor(
    private readonly provider: ethers.providers.Provider,
    private readonly signer: ethers.Signer,
  ) {
    this.storage = new LocalStorage();
  }

  public async getOrCreateAuthSignature(): Promise<AuthSignature> {
    const address = await this.signer.getAddress();
    const storageKey = `eth-signin-message-${address}`;

    // If we have a message in localStorage, return it
    const maybeMessage = this.storage.getItem(storageKey);
    if (maybeMessage) {
      return JSON.parse(maybeMessage);
    }

    // If at this point we didn't return, we need to create a new message
    const typedSignature = await this.createSiweMessage();
    this.storage.setItem(storageKey, JSON.stringify(typedSignature));
    return typedSignature;
  }

  private async createSiweMessage(): Promise<AuthSignature> {
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

  private getParametersOrDefault() {
    // If we are in a browser environment, we can get the domain and uri from the window object
    if (typeof window !== 'undefined') {
      const maybeOrigin = window?.location?.origin;
      return {
        domain: maybeOrigin.split('//')[1].split('.')[0],
        uri: maybeOrigin,
      };
    }
    // TODO: Add a facility to manage this case
    return {
      domain: 'localhost',
      uri: 'http://localhost:3000',
    };
  }
}
