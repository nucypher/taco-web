import {
  type Account,
  checkViemAvailability,
  type PublicClient,
  type WalletClient,
} from '@nucypher/shared';
import { ethers } from 'ethers';

import { TacoProvider, TacoSigner } from './base-interfaces';

/**
 * A provider that wraps viem PublicClient for TACo SDK compatibility
 *
 * This class implements the TacoProvider interface, providing only the methods
 * needed for the TACo SDK to work correctly.
 */
class ViemTacoProvider implements TacoProvider {
  private viemPublicClient: PublicClient;

  // Ethers.js compatibility properties for contract validation
  readonly _isProvider: boolean = true;
  readonly _network: Promise<ethers.providers.Network>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly formatter?: any = undefined;
  readonly _networkPromise?: Promise<ethers.providers.Network>;

  constructor(viemPublicClient: PublicClient) {
    this.viemPublicClient = viemPublicClient;
    // Initialize network for ethers compatibility
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

  async getBlockNumber(): Promise<number> {
    return Number(await this.viemPublicClient.getBlockNumber());
  }

  async getGasPrice(): Promise<ethers.BigNumber> {
    const gasPrice = await this.viemPublicClient.getGasPrice();
    return ethers.BigNumber.from(gasPrice.toString());
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
    // viem returns {data: "0x..."} but ethers expects just "0x..."
    if (typeof result === 'object' && result && 'data' in result) {
      return result.data as string;
    }
    return result as string;
  }

  async estimateGas(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<ethers.BigNumber> {
    const gas = await this.viemPublicClient.estimateGas({
      to: transaction.to as `0x${string}`,
      data: transaction.data as `0x${string}`,
      value: transaction.value
        ? BigInt(transaction.value.toString())
        : undefined,
    });
    return ethers.BigNumber.from(gas.toString());
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

  // Additional methods that ethers contracts might need
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resolveName(_name: string): Promise<string | null> {
    return null; // ENS resolution not implemented
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async lookupAddress(_address: string): Promise<string | null> {
    return null; // Reverse ENS lookup not implemented
  }

  async getFeeData(): Promise<ethers.providers.FeeData> {
    const gasPrice = await this.getGasPrice();
    return {
      gasPrice,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      lastBaseFeePerGas: null,
    };
  }
}

/**
 * Create a TACo-compatible provider from viem PublicClient
 *
 * Returns a provider that implements TacoProvider interface with only
 * the methods needed for TACo SDK operations.
 */
export async function createEthersProvider(
  viemPublicClient: PublicClient,
): Promise<TacoProvider> {
  await checkViemAvailability();
  return new ViemTacoProvider(viemPublicClient);
}

/**
 * A signer that wraps viem Account for TACo SDK compatibility
 *
 * This class implements the TacoSigner interface, providing only the methods
 * needed for the TACo SDK to work correctly.
 */
class ViemTacoSigner implements TacoSigner {
  private viemAccount: Account;
  public readonly provider: TacoProvider;

  constructor(viemAccount: Account, provider: TacoProvider) {
    this.viemAccount = viemAccount;
    this.provider = provider;
  }

  async getAddress(): Promise<string> {
    return this.viemAccount.address;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    await checkViemAvailability();
    const messageToSign =
      typeof message === 'string' ? message : new TextDecoder().decode(message);
    return await this.viemAccount.signMessage({ message: messageToSign });
  }

  async signTransaction(
    transaction: ethers.providers.TransactionRequest,
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

  connect(provider: TacoProvider): TacoSigner {
    return new ViemTacoSigner(this.viemAccount, provider);
  }

  async getBalance(
    blockTag?: ethers.providers.BlockTag,
  ): Promise<ethers.BigNumber> {
    return await this.provider.getBalance(this.viemAccount.address, blockTag);
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
}

/**
 * Create a TACo-compatible signer from viem Account
 *
 * Returns a signer that implements TacoSigner interface with only
 * the methods needed for TACo SDK operations.
 */
export async function createEthersSigner(
  viemAccount: Account,
  provider: TacoProvider,
): Promise<TacoSigner> {
  await checkViemAvailability();
  return new ViemTacoSigner(viemAccount, provider);
}

/**
 * Convenience function to create both provider and signer from viem clients
 *
 * @param viemPublicClient - Viem public client for provider functionality
 * @param viemWalletClient - Viem wallet client for signing functionality
 * @returns Object with TACo provider and signer
 */
export async function createEthersFromViem(
  viemPublicClient: PublicClient,
  viemWalletClient: WalletClient,
): Promise<{ provider: TacoProvider; signer: TacoSigner }> {
  await checkViemAvailability();

  if (!viemWalletClient.account) {
    throw new Error('Wallet client must have an account attached');
  }

  const provider = await createEthersProvider(viemPublicClient);
  const signer = await createEthersSigner(viemWalletClient.account, provider);

  return { provider, signer };
}
