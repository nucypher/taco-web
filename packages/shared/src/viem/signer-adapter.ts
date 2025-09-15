import { ethers } from 'ethers';

import { type TacoSigner } from '../taco-interfaces';
import { SignerLike } from '../types';

import { isViemAccount } from './type-guards';
import { type Account } from './types';

/**
 * Viem Signer Adapter
 *
 * This adapter implements the minimal TacoSigner interface for internal library use.
 * Unlike the provider adapter which creates actual ethers.js objects for external libraries,
 * this only implements the specific methods that TACo internally requires.
 *
 * Key differences from provider adapter:
 * - Implements minimal internal interface (not full ethers.Signer)
 * - Only methods actually used by TACo: getAddress() and signMessage()
 * - Lightweight wrapper for internal library operations
 */
export class ViemSignerAdapter implements TacoSigner {
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
    const messageToSign =
      typeof message === 'string' ? message : ethers.utils.hexlify(message);
    return await this.viemAccount.signMessage({ message: messageToSign });
  }
}

/**
 * Convert viem account to TacoSigner or return existing signer
 *
 * This is the main entry point for creating signers for internal TACo use.
 * Unlike toEthersProvider which creates actual ethers objects,
 * this creates minimal adapters implementing only what TACo needs.
 *
 * @param signerLike - Either a viem Account or an existing TacoSigner
 * @returns A TacoSigner interface implementation
 */
export function toTacoSigner(signerLike: SignerLike): TacoSigner {
  if (isViemAccount(signerLike)) {
    return new ViemSignerAdapter(signerLike);
  } else {
    return signerLike;
  }
}
