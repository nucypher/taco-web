import { ethers } from 'ethers';

/**
 * Basic TACo Provider interface
 *
 * This interface defines the minimal provider functionality needed for TACo operations.
 * It contains only the methods that TACo actually uses.
 * This interface is implemented by ViemTacoProvider. And any future provider implementation
 * would need to implement this interface.
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
 * It contains only the methods that TACo actually uses.
 * This interface is implemented by ViemTacoSigner. And any future signer implementation
 * would need to implement this interface.
 */
export interface TacoSigner {
  /**
   * Get the address of this signer
   */
  getAddress(): Promise<string>;

  /**
   * Sign a message
   */
  signMessage(message: string | Uint8Array): Promise<string>;
}
