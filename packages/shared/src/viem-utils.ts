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

// Type helper: Use the real type from 'viem' if available, otherwise fallback to 'any'
// This pattern preserves type safety for consumers who have 'viem' installed, but does not break for others.
// See: https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1367016530
// Dynamic imports resolve to 'unknown' when module is not available, no compile-time errors occur
type _ViemPublicClient = import('viem').PublicClient;
type _ViemAccount = import('viem').Account;
type _ViemWalletClient = import('viem').WalletClient;
type _ViemBlock = import('viem').Block;
type _ViemTypedDataDomain = import('viem').TypedDataDomain;
type _ViemTypedDataParameter = import('viem').TypedDataParameter;

/**
 * Viem PublicClient type for read operations
 * @see https://viem.sh/docs/clients/public
 */
export type PublicClient = [unknown] extends [_ViemPublicClient]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : _ViemPublicClient;
/**
 * Viem Account type for signing operations
 * @see https://viem.sh/docs/accounts/privateKey
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Account = [unknown] extends [_ViemAccount] ? any : _ViemAccount;

/**
 * Viem WalletClient type for wallet operations
 * @see https://viem.sh/docs/clients/wallet
 */
export type WalletClient = [unknown] extends [_ViemWalletClient]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : _ViemWalletClient;

/**
 * Viem Block type for block operations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ViemBlock = [unknown] extends [_ViemBlock] ? any : _ViemBlock;

/**
 * Viem TypedDataDomain type for EIP-712 domain
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ViemTypedDataDomain = [unknown] extends [_ViemTypedDataDomain]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : _ViemTypedDataDomain;

/**
 * Viem TypedDataParameter type for EIP-712 parameters
 */
export type ViemTypedDataParameter = [unknown] extends [_ViemTypedDataParameter]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : _ViemTypedDataParameter;

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
      'viem is required for viem wrapper functions. Install it with: npm install viem@^2.0.0',
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

  readonly _network: Promise<ethers.providers.Network>;
  readonly formatter?: undefined = undefined;

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
    const address_0x = address as `0x${string}`;
    let balance: bigint;

    if (
      blockTag === 'latest' ||
      blockTag === 'pending' ||
      blockTag === 'earliest' ||
      blockTag === 'safe' ||
      blockTag === 'finalized'
    ) {
      // Use blockTag for predefined string values
      balance = await this.viemPublicClient.getBalance({
        address: address_0x,
        blockTag: blockTag,
      });
    } else if (
      typeof blockTag === 'number' ||
      (typeof blockTag === 'string' && blockTag.startsWith('0x'))
    ) {
      // Use blockNumber for hex string values
      balance = await this.viemPublicClient.getBalance({
        address: address_0x,
        blockNumber: BigInt(blockTag),
      });
    } else {
      // Default case (undefined or unrecognized) - use latest
      balance = await this.viemPublicClient.getBalance({
        address: address_0x,
      });
    }
    return ethers.BigNumber.from(balance.toString());
  }

  /**
   * @remarks The _blockTag?: string | number parameter is not used in TACo, so it is not implemented
   */
  async getTransactionCount(address: string): Promise<number> {
    return await this.viemPublicClient.getTransactionCount({
      address: address as `0x${string}`,
    });
  }

  /**
   * @remarks The _blockTag?: string | number parameter is not used in TACo, so it is not implemented
   */
  async getCode(address: string): Promise<`0x${string}` | undefined> {
    return await this.viemPublicClient.getCode({
      address: address as `0x${string}`,
    });
  }

  /**
   * @remarks The _blockTag?: string | number parameter is not used in TACo, so it is not implemented
   */
  async call(
    transaction: ethers.providers.TransactionRequest,
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

  async getBlock(blockHashOrBlockTag: string | number): Promise<ViemBlock> {
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

  async getFeeData(): Promise<ethers.providers.FeeData> {
    const feeData = await this.viemPublicClient.getFeeHistory({
      blockCount: 4,
      blockTag: 'latest' as const,
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

  // Ethers.js compatibility properties for contract validation
  readonly _isSigner: boolean = true;

  constructor(viemAccount: Account, provider: ViemProviderBase) {
    this.viemAccount = viemAccount;
    this.provider = provider;
  }

  async getAddress(): Promise<string> {
    return this.viemAccount.address;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    await checkViemAvailability();
    if (!this.viemAccount.signMessage) {
      throw new Error('Account does not support message signing');
    }
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

  async signTypedData(
    domain: ViemTypedDataDomain,
    types: Record<string, readonly ViemTypedDataParameter[]>,
    message: Record<string, unknown>,
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

  /**
   * Connect this signer to a different provider
   * This method should be implemented by concrete signer classes
   */
  abstract connect(provider: ViemProviderBase): ViemSignerBase;
}
