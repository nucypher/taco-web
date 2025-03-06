import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

import { AuthProvider } from '../../auth-provider';
import { AuthSignature } from '../../auth-sig';
import { LocalStorage } from '../../storage';

import { EIP4361_AUTH_METHOD } from './common';

const ERR_MISSING_SIWE_PARAMETERS = 'Missing default SIWE parameters';

export class EIP4361AuthProvider implements AuthProvider {
  private readonly storage: LocalStorage;
  private readonly params: Partial<SiweMessage>;

  constructor(
    // TODO: We only need the provider to fetch the chainId, consider removing it
    private readonly provider: ethers.providers.Provider,
    private readonly signer: ethers.Signer,
    // `chainId` will be set from the provider. For do not accept it as input to eleminate ambiguity.
    params?: Omit<Partial<SiweMessage>, 'chainId'>,
  ) {
    this.storage = new LocalStorage();
    this.params = {
      ...this.getDefaultParameters(),
      version: '1',
      // the next means that if any of the parameters where provided at params, they will override the defaults
      ...params,
    };

    if (!this.params.domain || !this.params.uri) {
      throw new Error(ERR_MISSING_SIWE_PARAMETERS);
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
  }

  public async getOrCreateAuthSignature(): Promise<AuthSignature> {
    const address = await this.signer.getAddress();
    const storageKey = `eth-${EIP4361_AUTH_METHOD}-message-${address}`;

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

  private async createSIWEAuthMessage(): Promise<AuthSignature> {
    const address = await this.signer.getAddress();
    const chainId = (await this.provider.getNetwork()).chainId;
    const after2HoursFromNow = new Date(
      Date.now() + 2 * 60 * 60 * 1000,
    ).toISOString();

    // if the provided expirationTime was more than 2 hours from now, throw
    if (
      this.params.expirationTime &&
      this.params.expirationTime > after2HoursFromNow
    ) {
      throw new Error('expirationTime is too soon');
    }

    const siweMessage = new SiweMessage({
      ...this.params,
      address,
      statement: `${this.params.domain} wants you to sign in with your Ethereum account: ${address}`,
      chainId,
      // if the user does not provide an expirationTime, we set it to 2 hours from now
      expirationTime: this.params?.expirationTime ?? after2HoursFromNow,
    });
    const scheme = EIP4361_AUTH_METHOD;

    const message = siweMessage.prepareMessage();
    const signature = await this.signer.signMessage(message);

    // this will trigger validation for all parameters including `expirationTime` and `notBefore`.
    await siweMessage.verify({ signature });

    return { signature, address, scheme, typedData: message };
  }
}
