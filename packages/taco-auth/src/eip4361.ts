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

  public async getOrCreateSignInMessage(): Promise<string> {
    const address = await this.signer.getAddress();
    const storageKey = `eth-signin-message-${address}`;

    // If we have a message in localStorage, return it
    const maybeMessage = this.storage.getItem(storageKey);
    if (maybeMessage) {
      return maybeMessage;
    }

    // If at this point we didn't return, we need to create a new message
    const message = await this.crateSiweMessage();
    this.storage.setItem(storageKey, message);
    return message;
  }

  private async crateSiweMessage(): Promise<string> {
    const { blockNumber, chainId } = await this.getChainData();
    const address = await this.signer.getAddress();
    // TODO: Expose these as parameters
    const domain = 'yourdomain.com'; // replace with your domain
    const version = '1';
    const nonce = '0'; // replace with your nonce
    const uri = 'did:key:z6MkrBdNdwUPnXDVD1DCxedzVVBpaGi8aSmoXFAeKNgtAer8'; // replace with your uri

    const siweMessage = new SiweMessage({
      domain,
      address,
      // TODO: Is this statement application-specific?
      statement: `I'm signing in to ${domain} as of block number ${blockNumber}`,
      uri,
      version,
      nonce,
      chainId: chainId.toString(),
    });

    return siweMessage.toMessage();
  }

  private async getChainData(): Promise<{ blockNumber: number, chainId: number }> {
    const blockNumber = await this.provider.getBlockNumber();
    const chainId = (await this.provider.getNetwork()).chainId;
    return { blockNumber, chainId };
  }
}
