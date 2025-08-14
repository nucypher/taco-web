import {
  type Account,
  checkViemAvailability,
  type PublicClient,
} from '@nucypher/shared';
import { ethers } from 'ethers';

import { TacoAuthProvider, TacoAuthSigner } from './base-interfaces';

/**
 * A minimal provider that wraps viem PublicClient for auth provider compatibility
 *
 * This class implements only the methods needed for TACo authentication providers.
 * It implements the TacoAuthProvider interface, defining just the essential methods.
 */
class ViemAuthProvider implements TacoAuthProvider {
  private viemPublicClient: PublicClient;

  // Ethers.js compatibility properties to pass internal validation
  readonly _isProvider: boolean = true;
  readonly _network: Promise<ethers.providers.Network>;
  // Additional properties that ethers contracts might expect
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly formatter?: any = undefined;
  readonly _networkPromise?: Promise<ethers.providers.Network>;

  constructor(viemPublicClient: PublicClient) {
    this.viemPublicClient = viemPublicClient;
    // Initialize network promise for ethers compatibility
    this._network = this.getNetwork();
    this._networkPromise = this._network;
  }

  async getNetwork(): Promise<ethers.providers.Network> {
    const chainId = await this.viemPublicClient.getChainId();
    return {
      name: this.viemPublicClient.chain?.name || `chain-${chainId}`,
      chainId,
    };
  }

  // Additional method needed for some advanced TACo features (e.g., condition evaluation)
  async call(
    transaction: ethers.providers.TransactionRequest,
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
    if (typeof result === 'object' && result && 'data' in result) {
      return result.data as string;
    }
    return result as string;
  }

  async getBlockNumber(): Promise<number> {
    return Number(await this.viemPublicClient.getBlockNumber());
  }

  async getBalance(
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _blockTag?: string | number,
  ): Promise<ethers.BigNumber> {
    const balance = await this.viemPublicClient.getBalance({
      address: address as `0x${string}`,
    });
    return ethers.BigNumber.from(balance.toString());
  }

  async getTransactionCount(
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _blockTag?: string | number,
  ): Promise<number> {
    return Number(
      await this.viemPublicClient.getTransactionCount({
        address: address as `0x${string}`,
      }),
    );
  }

  async getCode(
    address: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _blockTag?: string | number,
  ): Promise<string> {
    return (
      (await this.viemPublicClient.getCode({
        address: address as `0x${string}`,
      })) || '0x'
    );
  }

  async estimateGas(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<ethers.BigNumber> {
    const gasEstimate = await this.viemPublicClient.estimateGas({
      to: transaction.to as `0x${string}`,
      data: transaction.data as `0x${string}`,
      value: transaction.value
        ? BigInt(transaction.value.toString())
        : undefined,
      from: transaction.from as `0x${string}`,
    });
    return ethers.BigNumber.from(gasEstimate.toString());
  }

  async getGasPrice(): Promise<ethers.BigNumber> {
    const gasPrice = await this.viemPublicClient.getGasPrice();
    return ethers.BigNumber.from(gasPrice.toString());
  }

  async getFeeData(): Promise<ethers.providers.FeeData> {
    const feeData = await this.viemPublicClient.getFeeHistory({
      blockCount: 4,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blockNumber: 'latest' as any,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getBlock(blockHashOrBlockTag: string | number): Promise<any> {
    return await this.viemPublicClient.getBlock({
      blockNumber:
        typeof blockHashOrBlockTag === 'number'
          ? BigInt(blockHashOrBlockTag)
          : // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ('latest' as any),
      blockHash:
        typeof blockHashOrBlockTag === 'string' &&
        blockHashOrBlockTag.startsWith('0x')
          ? (blockHashOrBlockTag as `0x${string}`)
          : undefined,
    });
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

  async resolveName(name: string): Promise<string | null> {
    try {
      return await this.viemPublicClient.getEnsAddress({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name: name as any,
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
 * A signer that wraps viem Account for auth provider compatibility
 *
 * This class implements the TacoAuthSigner interface, providing only the methods
 * needed for TACo authentication providers to work.
 */
class ViemAuthSigner implements TacoAuthSigner {
  private viemAccount: Account;
  public readonly provider: TacoAuthProvider;

  constructor(viemAccount: Account, provider: TacoAuthProvider) {
    this.viemAccount = viemAccount;
    this.provider = provider;
  }

  async getAddress(): Promise<string> {
    return this.viemAccount.address;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    await checkViemAvailability();
    // Convert message to hex if it's Uint8Array
    const messageToSign =
      typeof message === 'string' ? message : ethers.utils.hexlify(message);
    return await this.viemAccount.signMessage({ message: messageToSign });
  }

  // Additional method needed for EIP4361 auth (signTypedData for SIWE)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async signTypedData(domain: any, types: any, message: any): Promise<string> {
    await checkViemAvailability();
    return await this.viemAccount.signTypedData({
      domain,
      types,
      message,
      primaryType:
        Object.keys(types).find((key) => key !== 'EIP712Domain') || 'Message',
    });
  }

  // Additional required methods for full TacoAuthSigner interface
  async signTransaction(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<string> {
    await checkViemAvailability();
    // Convert ethers transaction format to viem format
    const viemTransaction = {
      to: transaction.to as `0x${string}`,
      data: transaction.data as `0x${string}`,
      value: transaction.value
        ? BigInt(transaction.value.toString())
        : undefined,
      gas: transaction.gasLimit
        ? BigInt(transaction.gasLimit.toString())
        : undefined,
      gasPrice: transaction.gasPrice
        ? BigInt(transaction.gasPrice.toString())
        : undefined,
      maxFeePerGas: transaction.maxFeePerGas
        ? BigInt(transaction.maxFeePerGas.toString())
        : undefined,
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas
        ? BigInt(transaction.maxPriorityFeePerGas.toString())
        : undefined,
      nonce: transaction.nonce,
    };
    return await this.viemAccount.signTransaction(viemTransaction);
  }

  connect(provider: TacoAuthProvider): TacoAuthSigner {
    return new ViemAuthSigner(this.viemAccount, provider);
  }

  async getBalance(): Promise<ethers.BigNumber> {
    return await this.provider.getBalance(this.viemAccount.address);
  }

  async getTransactionCount(
    blockTag?: ethers.providers.BlockTag,
  ): Promise<number> {
    return await this.provider.getTransactionCount(
      this.viemAccount.address,
      blockTag,
    );
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
}

/**
 * Create a TACo-compatible provider from viem PublicClient
 *
 * Returns a provider that implements TacoAuthProvider interface with only
 * the methods needed for TACo authentication providers.
 */
export async function createEthersProvider(viemPublicClient: PublicClient) {
  await checkViemAvailability();
  return new ViemAuthProvider(viemPublicClient) as unknown as TacoAuthProvider;
}

/**
 * Create a TACo-compatible signer from viem Account
 *
 * Returns a signer that implements TacoAuthSigner interface with only
 * the methods needed for TACo authentication providers.
 */
export async function createEthersSigner(
  viemAccount: Account,
  provider: TacoAuthProvider,
) {
  await checkViemAvailability();
  return new ViemAuthSigner(viemAccount, provider) as unknown as TacoAuthSigner;
}
