import { ethers } from 'ethers';

import type { ViemTypedDataDomain, ViemTypedDataParameter } from './viem-utils';

/**
 * Basic TACo Provider interface
 * 
 * This interface defines the minimal provider contract needed for TACo operations.
 * It abstracts away the underlying blockchain library (ethers, viem, etc.) and 
 * focuses only on the methods that TACo actually uses.
 */
export interface TacoProvider {
  /**
   * Get network information
   */
  getNetwork(): Promise<ethers.providers.Network>;

  /**
   * Make a contract call
   */
  call(transaction: ethers.providers.TransactionRequest): Promise<string>;

  /**
   * Get the current block number
   */
  getBlockNumber(): Promise<number>;

  /**
   * Get balance for an address
   */
  getBalance(address: string, blockTag?: string | number): Promise<ethers.BigNumber>;

  /**
   * Get transaction count for an address
   */
  getTransactionCount(address: string): Promise<number>;

  /**
   * Get code at an address
   */
  getCode(address: string): Promise<string | undefined>;

  /**
   * Estimate gas for a transaction
   */
  estimateGas(transaction: ethers.providers.TransactionRequest): Promise<ethers.BigNumber>;

  /**
   * Get current gas price
   */
  getGasPrice(): Promise<ethers.BigNumber>;

  /**
   * Get fee data for EIP-1559 transactions
   */
  getFeeData(): Promise<ethers.providers.FeeData>;

  /**
   * Resolve ENS name to address
   */
  resolveName(name: string): Promise<string | null>;

  /**
   * Lookup ENS name for address
   */
  lookupAddress(address: string): Promise<string | null>;
}

/**
 * Basic TACo Signer interface
 * 
 * This interface defines the minimal signer contract needed for TACo operations.
 * It abstracts away the underlying blockchain library (ethers, viem, etc.) and 
 * focuses only on the methods that TACo actually uses.
 */
export interface TacoSigner {
  /**
   * The provider associated with this signer
   */
  readonly provider: TacoProvider;

  /**
   * Get the address of this signer
   */
  getAddress(): Promise<string>;

  /**
   * Sign a message
   */
  signMessage(message: string | Uint8Array): Promise<string>;

  /**
   * Sign typed data (EIP-712)
   */
  signTypedData(
    domain: ViemTypedDataDomain,
    types: Record<string, readonly ViemTypedDataParameter[]>,
    message: Record<string, unknown>,
  ): Promise<string>;

  /**
   * Get balance for this signer's address
   */
  getBalance(): Promise<ethers.BigNumber>;

  /**
   * Get transaction count for this signer's address
   */
  getTransactionCount(): Promise<number>;

  /**
   * Estimate gas for a transaction
   */
  estimateGas(transaction: ethers.providers.TransactionRequest): Promise<ethers.BigNumber>;

  /**
   * Make a contract call using this signer's address
   */
  call(transaction: ethers.providers.TransactionRequest): Promise<string>;

  /**
   * Connect this signer to a different provider
   */
  connect(provider: TacoProvider): TacoSigner;
}
