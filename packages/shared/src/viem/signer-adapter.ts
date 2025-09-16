import { type TACoSigner } from '../taco-interfaces';
import { SignerLike } from '../types';

import { isViemAccount } from './type-guards';
import { type Account } from './types';

/**
 * Viem Signer Adapter
 *
 * This adapter implements the minimal TACoSigner interface for internal library use.
 * Unlike the provider adapter which creates actual ethers.js objects for external libraries,
 * this only implements the specific methods that TACo internally requires.
 *
 * Key differences from provider adapter:
 * - Implements minimal internal interface (not full ethers.Signer)
 * - Only methods actually used by TACo: getAddress() and signMessage()
 * - Lightweight wrapper for internal library operations
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

/**
 * Convert viem account to TACoSigner or return existing signer
 *
 * This is the main entry point for creating signers for internal TACo use.
 * Unlike toEthersProvider which creates actual ethers objects,
 * this creates minimal adapters implementing only what TACo needs.
 *
 * @param signerLike - Either a viem Account or an existing TACoSigner
 * @returns A TACoSigner interface implementation
 */
export function toTACoSigner(signerLike: SignerLike): TACoSigner {
  if (isViemAccount(signerLike)) {
    return new ViemSignerAdapter(signerLike);
  } else {
    return signerLike;
  }
}
