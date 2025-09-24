import { ethers } from 'ethers';

import { type TacoSigner } from '../taco-signer';

import { type Address, type SignerAccount } from './types';

/**
 * Viem Signer Adapter
 *
 * This adapter implements the minimal TacoSigner interface for internal library use.
 */
export class ViemSignerAdapter implements TacoSigner {
  protected viemAccount: SignerAccount;

  constructor(viemAccount: SignerAccount) {
    this.viemAccount = viemAccount;
  }

  async getAddress(): Promise<Address> {
    let address: Address | undefined;
    if ('address' in this.viemAccount) {
      // viemAccount is a LocalAccount
      address = this.viemAccount.address;
    } else if (
      'account' in this.viemAccount &&
      this.viemAccount.account &&
      'address' in this.viemAccount.account
    ) {
      // viemAccount is a WalletClient
      address = this.viemAccount.account.address;
    }
    if (address) {
      // Get the checksummed address to avoid getting
      // "invalid EIP-55 address - 0x31663c14545df87044d2c5407ad0c2696b6d1402"
      // that might be thrown at package siwe-parser while perform decryption
      return ethers.utils.getAddress(address) as Address;
    }
    throw new Error(
      'Unable to retrieve address from viem account. Expected a LocalAccount with "address" property or WalletClient with "account.address" property.',
    );
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.viemAccount.signMessage) {
      throw new Error(
        'Account does not support message signing. Expected a LocalAccount or a WalletClient with signing capability.',
      );
    }
    if (typeof message === 'string') {
      return await this.viemAccount.signMessage({
        account: await this.getAddress(),
        message,
      });
    } else {
      return await this.viemAccount.signMessage({
        account: await this.getAddress(),
        message: { raw: message },
      });
    }
  }
}
