import { SiweMessage } from '@didtools/cacao';
import { ethers } from 'ethers';

import { LocalStorage } from './storage';

export class EIP4361SignatureProvider {
  private readonly storage: LocalStorage;

  constructor(
    private readonly provider: ethers.providers.Provider,
    private readonly signer: ethers.Signer,
  ) {
    this.storage = new LocalStorage();
  }

  public async getOrCreateSiweMessage(
    domain: string,
    version: string,
    nonce: string,
    uri: string,
  ): Promise<string> {
    const address = await this.signer.getAddress();
    const storageKey = `eth-signin-message-${address}`;

    // If we have a message in localStorage, return it
    const maybeMessage = this.storage.getItem(storageKey);
    if (maybeMessage) {
      return maybeMessage;
    }

    // If at this point we didn't return, we need to create a new message
    const message = await this.createSiweMessage(domain, version, nonce, uri);
    this.storage.setItem(storageKey, message);
    return message;
  }

  private async createSiweMessage(
    domain: string,
    version: string,
    nonce: string,
    uri: string,
  ): Promise<string> {
    const chainId = (await this.provider.getNetwork()).chainId;
    const address = await this.signer.getAddress();

    const siweMessage = new SiweMessage({
      domain,
      address,
      statement: `${domain} wants you to sign in with your Ethereum account: ${address}`,
      uri,
      version,
      nonce,
      chainId: chainId.toString(),
    });

    return siweMessage.toMessage();
  }
}
