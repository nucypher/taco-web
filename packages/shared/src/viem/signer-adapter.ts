import { type TACoSigner } from '../taco-signer';

import { type Account } from './types';

/**
 * Viem Signer Adapter
 *
 * This adapter implements the minimal TACoSigner interface for internal library use.
 */
export class ViemSignerAdapter implements TACoSigner {
  protected viemAccount: Account;

  constructor(viemAccount: Account) {
    this.viemAccount = viemAccount;
  }

  async getAddress(): Promise<string> {
    return this.viemAccount.address;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.viemAccount.signMessage) {
      throw new Error('Account does not support message signing');
    }
    if (typeof message === 'string') {
      return await this.viemAccount.signMessage({ message });
    } else {
      return await this.viemAccount.signMessage({
        message: { raw: message },
      });
    }
  }
}
