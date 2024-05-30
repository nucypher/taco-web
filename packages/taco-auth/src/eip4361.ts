import { ethers } from 'ethers';
import { generateNonce, SiweMessage } from 'siwe';

import { LocalStorage } from './storage';
import { TypedSignature } from './types';

export class EIP4361SignatureProvider {
  private readonly storage: LocalStorage;

  constructor(
    private readonly provider: ethers.providers.Provider,
    private readonly signer: ethers.Signer,
  ) {
    this.storage = new LocalStorage();
  }

  public async getOrCreateSiweMessage(): Promise<TypedSignature> {
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

  private async createSiweMessage(): Promise<TypedSignature> {
    const address = await this.signer.getAddress();
    const domain = 'TACo';
    const version = '1';
    const nonce = generateNonce();
    const uri = 'taco://';
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
    const signature = await this.signer.signMessage(siweMessage.toMessage());

    return { signature, address, scheme, typedData: siweMessage };
  }
}
