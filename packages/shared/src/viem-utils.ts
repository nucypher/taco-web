/**
 * Shared viem utilities for TACo packages
 *
 * This module provides consistent viem integration utilities across all TACo packages,
 * eliminating code duplication while maintaining clean architecture.
 *
 * Features:
 * - Optional viem dependency handling with helpful error messages
 * - Dynamic import pattern that's webpack-compatible
 * - Centralized type definitions for viem objects
 * - Runtime availability checking with caching
 * - Common wrapper implementations for providers and signers
 *
 * Usage:
 * ```typescript
 * import { checkViemAvailability, type PublicClient, ViemProviderBase } from '@nucypher/shared';
 *
 * class MyViemProvider extends ViemProviderBase {
 *   // Add package-specific methods
 * }
 * ```
 */

import { ethers } from 'ethers';

// Dynamic type definitions for viem objects
// Using 'any' types to avoid compile-time viem dependency
// These will be properly typed when viem is actually imported

/**
 * Viem PublicClient type for read operations
 * @see https://viem.sh/docs/clients/public
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PublicClient = any;

/**
 * Viem Account type for signing operations
 * @see https://viem.sh/docs/accounts/privateKey
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Account = any;

/**
 * Viem WalletClient type for wallet operations
 * @see https://viem.sh/docs/clients/wallet
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WalletClient = any;

// Internal state for tracking viem availability
let isViemAvailable = false;

/**
 * Check if viem is available and dynamically import it
 *
 * This function performs a dynamic import of viem to check availability.
 * It uses caching to avoid repeated imports and provides helpful error
 * messages when viem is not installed.
 *
 * @throws {Error} When viem is not installed with installation instructions
 * @example
 * ```typescript
 * try {
 *   await checkViemAvailability();
 *   // viem is available, safe to use viem functions
 * } catch (error) {
 *   console.error(error.message); // "viem is required..."
 * }
 * ```
 */
export async function checkViemAvailability(): Promise<void> {
  if (isViemAvailable) {
    return;
  }
  try {
    // Use direct string literal for webpack compatibility
    // This prevents "Critical dependency: the request of a dependency is an expression" warnings
    await import('viem');
    isViemAvailable = true;
  } catch (error) {
    throw new Error(
      'viem is required for viem wrapper functions. Install it with: npm install viem',
    );
  }
}

/**
 * Base provider class that implements common viem-to-ethers provider wrapper functionality
 *
 * This class contains all the shared implementation logic between taco and taco-auth packages.
 * Package-specific provider classes can extend this to add additional methods.
 */
export abstract class ViemProviderBase {
  protected viemPublicClient: PublicClient;

  // Ethers.js compatibility properties for contract validation
  readonly _isProvider: boolean = true;
  readonly _network: Promise<ethers.providers.Network>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly formatter?: any = undefined;

  constructor(viemPublicClient: PublicClient) {
    this.viemPublicClient = viemPublicClient;
    // Initialize network for ethers compatibility
    this._network = this.getNetwork();
  }

  async getNetwork(): Promise<ethers.providers.Network> {
    const chainId = await this.viemPublicClient.getChainId();
    const name = this.viemPublicClient.chain?.name || `chain-${chainId}`;
    return {
      name,
      chainId,
    };
  }

  async getBlockNumber(): Promise<number> {
    return Number(await this.viemPublicClient.getBlockNumber());
  }

  async getBalance(
    address: string,
    blockTag?: string | number,
  ): Promise<ethers.BigNumber> {
    let block: bigint | 'latest' | 'pending' | undefined;
    if (blockTag === 'latest' || blockTag === 'pending') {
      block = blockTag;
    } else if (typeof blockTag === 'number') {
      block = BigInt(blockTag);
    } else if (typeof blockTag === 'string') {
      // Handle hex block numbers
      block = BigInt(blockTag);
    } else {
      block = undefined; // Latest
    }

    const balance = await this.viemPublicClient.getBalance({
      address: address as `0x${string}`,
      blockNumber: block,
    });
    return ethers.BigNumber.from(balance.toString());
  }

  async getTransactionCount(
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _blockTag?: string | number,
  ): Promise<number> {
    return await this.viemPublicClient.getTransactionCount({
      address: address as `0x${string}`,
    });
  }

  async getCode(
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _blockTag?: string | number,
  ): Promise<string> {
    return await this.viemPublicClient.getCode({
      address: address as `0x${string}`,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async call(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _blockTag?: string | number,
  ): Promise<string> {
    const result = await this.viemPublicClient.call({
      to: transaction.to as `0x${string}`,
      data: transaction.data as `0x${string}`,
      value: transaction.value
        ? BigInt(transaction.value.toString())
        : undefined,
    });
    // viem may return "0x..." (string) or {data: "0x..."} (object)
    if (typeof result === 'object' && result && 'data' in result) {
      return result.data as string;
    }
    return result as string;
  }

  async estimateGas(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<ethers.BigNumber> {
    const viemTransaction = {
      to: transaction.to as `0x${string}`,
      data: transaction.data as `0x${string}`,
      value: transaction.value
        ? BigInt(transaction.value.toString())
        : undefined,
    };
    const gas = await this.viemPublicClient.estimateGas(viemTransaction);
    return ethers.BigNumber.from(gas.toString());
  }

  async getGasPrice(): Promise<ethers.BigNumber> {
    const gasPrice = await this.viemPublicClient.getGasPrice();
    return ethers.BigNumber.from(gasPrice.toString());
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getBlock(blockHashOrBlockTag: string | number): Promise<any> {
    if (
      typeof blockHashOrBlockTag === 'string' &&
      blockHashOrBlockTag.startsWith('0x')
    ) {
      return await this.viemPublicClient.getBlock({
        blockHash: blockHashOrBlockTag as `0x${string}`,
      });
    } else {
      return await this.viemPublicClient.getBlock({
        blockNumber: BigInt(blockHashOrBlockTag),
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTransaction(transactionHash: string): Promise<any> {
    return await this.viemPublicClient.getTransaction({
      hash: transactionHash as `0x${string}`,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTransactionReceipt(transactionHash: string): Promise<any> {
    return await this.viemPublicClient.getTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async waitForTransaction(transactionHash: string): Promise<any> {
    return await this.viemPublicClient.waitForTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });
  }

  async getFeeData(): Promise<ethers.providers.FeeData> {
    const feeData = await this.viemPublicClient.getFeeHistory({
      blockCount: 4,
      blockNumber: 'latest' as const,
      rewardPercentiles: [25, 50, 75],
    });
    // Use the latest base fee and priority fee
    const latestBaseFee =
      feeData.baseFeePerGas[feeData.baseFeePerGas.length - 1];
    const latestReward = feeData.reward?.[feeData.reward.length - 1];
    const medianPriorityFee = latestReward ? latestReward[1] : BigInt(0);

    return {
      maxFeePerGas: ethers.BigNumber.from(
        (latestBaseFee + medianPriorityFee).toString(),
      ),
      maxPriorityFeePerGas: ethers.BigNumber.from(medianPriorityFee.toString()),
      gasPrice: ethers.BigNumber.from(latestBaseFee.toString()),
      lastBaseFeePerGas: ethers.BigNumber.from(latestBaseFee.toString()),
    };
  }

  async resolveName(name: string): Promise<string | null> {
    try {
      return await this.viemPublicClient.getEnsAddress({
        name: name as string,
      });
    } catch {
      return null;
    }
  }

  async lookupAddress(address: string): Promise<string | null> {
    try {
      return await this.viemPublicClient.getEnsName({
        address: address as `0x${string}`,
      });
    } catch {
      return null;
    }
  }
}

/**
 * Base class for signers that wrap viem Account objects
 *
 * This class contains all the shared implementation logic between taco and taco-auth packages.
 * Package-specific signer classes can extend this to add additional methods.
 */
export abstract class ViemSignerBase {
  protected viemAccount: Account;
  public readonly provider: ViemProviderBase;

  constructor(viemAccount: Account, provider: ViemProviderBase) {
    this.viemAccount = viemAccount;
    this.provider = provider;
  }

  async getAddress(): Promise<string> {
    return this.viemAccount.address;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    await checkViemAvailability();
    // Convert message to hex if it's Uint8Array for compatibility
    const messageToSign =
      typeof message === 'string' ? message : ethers.utils.hexlify(message);
    return await this.viemAccount.signMessage({ message: messageToSign });
  }

  async getBalance(): Promise<ethers.BigNumber> {
    return await this.provider.getBalance(this.viemAccount.address);
  }

  async getTransactionCount(): Promise<number> {
    return await this.provider.getTransactionCount(this.viemAccount.address);
  }

  async estimateGas(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<ethers.BigNumber> {
    return await this.provider.estimateGas(transaction);
  }

  async call(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<string> {
    return await this.provider.call(transaction);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async signTypedData(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    domain: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    types: Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: Record<string, any>,
  ): Promise<string> {
    await checkViemAvailability();
    if (!this.viemAccount.signTypedData) {
      throw new Error('Account does not support typed data signing');
    }

    return await this.viemAccount.signTypedData({
      domain,
      types,
      message,
      primaryType:
        Object.keys(types).find((key) => key !== 'EIP712Domain') || 'Message',
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async signTransaction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction: any,
  ): Promise<string> {
    await checkViemAvailability();
    if (!this.viemAccount.signTransaction) {
      throw new Error('Account does not support transaction signing');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viemTx: any = {
      to: transaction.to as `0x${string}`,
      value: transaction.value
        ? BigInt(transaction.value.toString())
        : undefined,
      data: transaction.data as `0x${string}`,
      gas: transaction.gasLimit
        ? BigInt(transaction.gasLimit.toString())
        : undefined,
      gasPrice: transaction.gasPrice
        ? BigInt(transaction.gasPrice.toString())
        : undefined,
      nonce: transaction.nonce ? Number(transaction.nonce) : undefined,
    };

    return await this.viemAccount.signTransaction(viemTx);
  }
}
