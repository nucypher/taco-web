import { ethers } from 'ethers';

/**
 * Minimal Provider interface needed by TACo SDK
 *
 * This defines the minimal contract that both ethers providers and viem-wrapped providers
 * must satisfy for the TACo SDK to work correctly.
 *
 * Ethers providers naturally satisfy this interface due to structural typing.
 * Viem wrappers implement this interface explicitly.
 */
export interface TacoProvider {
  /**
   * Get network information including chainId
   * @returns Promise resolving to network information
   */
  getNetwork(): Promise<ethers.providers.Network>;

  /**
   * Make a read-only call to a contract
   * Required for DKG coordinator and condition evaluation
   */
  call(
    transaction: ethers.providers.TransactionRequest,
    blockTag?: string | number,
  ): Promise<string>;

  /**
   * Get current block number
   * Required for some condition evaluations
   */
  getBlockNumber(): Promise<number>;

  /**
   * Get balance of an address
   * Required for balance-based conditions
   */
  getBalance(
    address: string,
    blockTag?: string | number,
  ): Promise<ethers.BigNumber>;

  /**
   * Get transaction count (nonce) for an address
   * Required for some contract operations
   */
  getTransactionCount(
    address: string,
    blockTag?: string | number,
  ): Promise<number>;

  /**
   * Get contract code at an address
   * Required for contract validation
   */
  getCode(address: string, blockTag?: string | number): Promise<string>;

  /**
   * Estimate gas for a transaction
   * Required for transaction preparation
   */
  estimateGas(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<ethers.BigNumber>;

  /**
   * Get gas price information
   * Required for transaction preparation
   */
  getGasPrice(): Promise<ethers.BigNumber>;

  /**
   * Get fee data (gas price, max fees)
   * Required for EIP-1559 transactions
   */
  getFeeData(): Promise<ethers.providers.FeeData>;

  /**
   * Get block information
   * Required for some condition evaluations
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getBlock(blockHashOrBlockTag: string | number): Promise<any>;

  /**
   * Get transaction information
   * Required for transaction monitoring
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTransaction(transactionHash: string): Promise<any>;

  /**
   * Get transaction receipt
   * Required for transaction confirmation
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTransactionReceipt(transactionHash: string): Promise<any>;

  /**
   * Wait for transaction confirmation
   * Required for transaction monitoring
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  waitForTransaction(transactionHash: string): Promise<any>;

  /**
   * Resolve ENS name to address
   * Optional for ENS support
   */
  resolveName(name: string): Promise<string | null>;

  /**
   * Reverse resolve address to ENS name
   * Optional for ENS support
   */
  lookupAddress(address: string): Promise<string | null>;
}

/**
 * Minimal Signer interface needed by TACo SDK
 *
 * This defines the minimal contract that both ethers signers and viem-wrapped signers
 * must satisfy for the TACo SDK to work correctly.
 *
 * Ethers signers naturally satisfy this interface due to structural typing.
 * Viem wrappers implement this interface explicitly.
 */
export interface TacoSigner {
  /**
   * The provider attached to this signer
   * Required for compatibility with ethers signers
   */
  readonly provider: TacoProvider;

  /**
   * Get the signer's address
   * @returns Promise resolving to the signer's Ethereum address
   */
  getAddress(): Promise<string>;

  /**
   * Sign a message with the signer
   * @param message - Message to sign (string or Uint8Array)
   * @returns Promise resolving to the signature
   */
  signMessage(message: string | Uint8Array): Promise<string>;

  /**
   * Sign a transaction
   * Required for transaction broadcasting
   */
  signTransaction(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<string>;

  /**
   * Sign typed data (EIP-712)
   * Required for structured message signing
   */
  signTypedData(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    domain: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    types: Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: Record<string, any>,
  ): Promise<string>;

  /**
   * Connect to a different provider
   * Required for provider switching
   */
  connect(provider: TacoProvider): TacoSigner;

  /**
   * Get balance of the signer's address
   * Convenience method using attached provider
   */
  getBalance(): Promise<ethers.BigNumber>;

  /**
   * Get transaction count for the signer's address
   * Convenience method using attached provider
   */
  getTransactionCount(): Promise<number>;

  /**
   * Estimate gas for a transaction
   * Convenience method using attached provider
   */
  estimateGas(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<ethers.BigNumber>;

  /**
   * Make a read-only call
   * Convenience method using attached provider
   */
  call(transaction: ethers.providers.TransactionRequest): Promise<string>;
}
