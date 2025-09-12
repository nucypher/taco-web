import { ethers } from 'ethers';

import { type TacoSigner } from '../taco-interfaces';
import { SignerLike } from '../types';

import { isViemAccount } from './type-guards';
import { type Account } from './types';

/**
 * Viem TACo Signer
 *
 * This class implements the TacoSigner interface using viem accounts.
 */
export class ViemTacoSigner implements TacoSigner {
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
 * Create a TACo signer from viem Account
 *
 * This function creates a TacoSigner directly from a viem account.
 *
 * @param signerLike - Viem account for signing operations or existing TacoSigner
 */
export function toTacoSigner(signerLike: SignerLike): TacoSigner {
  if (isViemAccount(signerLike)) {
    return new ViemTacoSigner(signerLike);
  } else {
    return signerLike;
  }
}
