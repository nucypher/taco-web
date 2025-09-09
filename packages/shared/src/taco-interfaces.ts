import { ethers } from 'ethers';

/**
 * Basic TACo Provider interface
 *
 * This interface defines the minimal provider functionality needed for TACo operations.
 * It abstracts away the underlying blockchain library (ethers, viem, etc.) and
 * focuses only on the methods that TACo actually uses.
 */
export interface TacoProvider {
  /**
   * Ethers.js compatibility property for contract validation
   */
  readonly _isProvider: boolean;

  /**
   * Get network information
   */
  getNetwork(): Promise<ethers.providers.Network>;

  /**
   * Make a contract call
   */
  call(transaction: ethers.providers.TransactionRequest): Promise<string>;
}

/**
 * Basic TACo Signer interface
 *
 * This interface defines the minimal signer functionality needed for TACo operations.
 * It abstracts away the underlying blockchain library (ethers, viem, etc.) and
 * focuses only on the methods that TACo actually uses.
 */
export interface TacoSigner {
  /**
   * The provider this signer is connected to (optional for signing-only operations)
   */
  readonly provider?: TacoProvider | undefined;

  /**
   * Get the address of this signer
   */
  getAddress(): Promise<string>;

  /**
   * Sign a message
   */
  signMessage(message: string | Uint8Array): Promise<string>;
}
