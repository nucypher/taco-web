import { ethers } from 'ethers';
import { generateNonce, SiweMessage } from 'siwe';

import { LocalStorage } from '../storage';
import { AuthSignature, EIP4361_AUTH_METHOD } from '../types';

export type EIP4361TypedData = string;

export class EIP4361AuthProvider {
  private readonly storage: LocalStorage;

  constructor(
    // TODO: We only need the provider to fetch the chainId, consider removing it
    private readonly provider: ethers.providers.Provider,
    private readonly signer: ethers.Signer,
  ) {
    this.storage = new LocalStorage();
  }

  public async getOrCreateAuthSignature(): Promise<AuthSignature> {
    const address = await this.signer.getAddress();
    const storageKey = `eth-${EIP4361_AUTH_METHOD}-message-${address}`;

    // If we have a message in localStorage, return it
    const maybeMessage = this.storage.getItem(storageKey);
    if (maybeMessage) {
      return JSON.parse(maybeMessage);
    }

    // If at this point we didn't return, we need to create a new message
    const authMessage = await this.createSIWEAuthMessage();
    this.storage.setItem(storageKey, JSON.stringify(authMessage));
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
