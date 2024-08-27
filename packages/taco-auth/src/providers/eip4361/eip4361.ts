import { ethers } from 'ethers';
import { generateNonce, SiweMessage } from 'siwe';

import { AuthSignature } from '../../auth-sig';
import { LocalStorage } from '../../storage';

import { EIP4361_AUTH_METHOD } from './common';

export const USER_ADDRESS_PARAM_DEFAULT = ':userAddress';

export type EIP4361AuthProviderParams = {
  domain: string;
  uri: string;
};

const ERR_MISSING_SIWE_PARAMETERS = 'Missing default SIWE parameters';

export class EIP4361AuthProvider {
  private readonly storage: LocalStorage;
  private readonly providerParams: EIP4361AuthProviderParams;

  constructor(
    // TODO: We only need the provider to fetch the chainId, consider removing it
    private readonly provider: ethers.providers.Provider,
    private readonly signer: ethers.Signer,
    providerParams?: EIP4361AuthProviderParams,
  ) {
    this.storage = new LocalStorage();
    if (providerParams) {
      this.providerParams = providerParams;
    } else {
      this.providerParams = this.getDefaultParameters();
    }
  }

  private getDefaultParameters() {
    if (typeof window !== 'undefined') {
      // If we are in a browser environment, we can get the domain and uri from the window object
      return {
        domain: window.location?.host,
        uri: window.location?.origin,
      };
    }
    // If not, we have no choice but to throw an error
    throw new Error(ERR_MISSING_SIWE_PARAMETERS);
  }

  public async getOrCreateAuthSignature(): Promise<AuthSignature> {
    const address = await this.signer.getAddress();
    const storageKey = `eth-${EIP4361_AUTH_METHOD}-message-${address}`;

    // If we have a signature in localStorage, return it
    const maybeSignature = this.storage.getAuthSignature(storageKey);
    if (maybeSignature) {
      // check whether older than node freshness requirement
      if (this.isMessageExpired(maybeSignature.typedData)) {
        // clear signature so that it will be recreated and stored
        this.storage.clear(storageKey);
      } else {
        return maybeSignature;
      }
    }

    // If at this point we didn't return, we need to create a new message
    const authMessage = await this.createSIWEAuthMessage();
    this.storage.setAuthSignature(storageKey, authMessage);
    return authMessage;
  }

  private isMessageExpired(message: string): boolean {
    const siweMessage = new SiweMessage(message);
    if (!siweMessage.issuedAt) {
      // don't expect to ever happen; but just in case
      return false;
    }

    const twoHourWindow = new Date(siweMessage.issuedAt);
    twoHourWindow.setHours(twoHourWindow.getHours() + 2);
    const now = new Date();
    return twoHourWindow < now;
  }

  private async createSIWEAuthMessage(): Promise<AuthSignature> {
    const address = await this.signer.getAddress();
    const { domain, uri } = this.providerParams;
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
    const scheme = EIP4361_AUTH_METHOD;
    const message = siweMessage.prepareMessage();
    const signature = await this.signer.signMessage(message);
    return { signature, address, scheme, typedData: message };
  }
}
