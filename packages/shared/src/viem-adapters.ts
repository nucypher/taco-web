import { ethers, TypedDataDomain, TypedDataField } from 'ethers';

import { type TacoProvider, type TacoSigner } from './taco-interfaces';
import {
  type Account,
  checkViemAvailability,
  type PublicClient,
  type ViemTypedDataDomain,
  type ViemTypedDataParameter,
  type WalletClient,
} from './viem-utils';

/**
 * Viem TACo Provider
 *
 * This class implements the TacoProvider interface directly using viem clients.
 * It bridges the gap between viem and ethers.js interfaces.
 * Used by both taco and taco-auth packages to avoid code duplication.
 */
export class ViemTacoProvider implements TacoProvider {
  protected viemPublicClient: PublicClient;

  // Ethers.js compatibility property for contract validation
  readonly _isProvider = true;
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
      balance = await this.viemPublicClient.getBalance({
        address: address_0x,
        blockTag: blockTag,
      });
    } else if (
      typeof blockTag === 'number' ||
      (typeof blockTag === 'string' && blockTag.startsWith('0x'))
    ) {
      balance = await this.viemPublicClient.getBalance({
        address: address_0x,
        blockNumber: BigInt(blockTag),
      });
    } else {
      balance = await this.viemPublicClient.getBalance({
        address: address_0x,
      });
    }
    return ethers.BigNumber.from(balance.toString());
  }

  async getTransactionCount(address: string): Promise<number> {
    return await this.viemPublicClient.getTransactionCount({
      address: address as `0x${string}`,
    });
  }

  async getCode(address: string): Promise<`0x${string}` | undefined> {
    return await this.viemPublicClient.getCode({
      address: address as `0x${string}`,
    });
  }

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

  async getFeeData(): Promise<ethers.providers.FeeData> {
    const feeData = await this.viemPublicClient.getFeeHistory({
      blockCount: 4,
      blockTag: 'latest' as const,
      rewardPercentiles: [25, 50, 75],
    });
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
 * Viem TACo Signer
 *
 * This class implements the TacoSigner interface directly using viem accounts.
 * It bridges the gap between viem and ethers.js interfaces.
 * Used by both taco and taco-auth packages to avoid code duplication.
 */
export class ViemTacoSigner implements TacoSigner {
  protected viemAccount: Account;
  public readonly provider?: TacoProvider | undefined;

  // Ethers.js compatibility properties for contract validation
  readonly _isSigner = true;

  constructor(viemAccount: Account, provider?: TacoProvider | undefined) {
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
    const messageToSign =
      typeof message === 'string' ? message : ethers.utils.hexlify(message);
    return await this.viemAccount.signMessage({ message: messageToSign });
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    message: Record<string, unknown>,
  ): Promise<string> {
    await checkViemAvailability();
    if (!this.viemAccount.signTypedData) {
      throw new Error('Account does not support typed data signing');
    }

    // Convert ethers domain to viem domain - handle BigNumberish types
    let chainId: number | bigint | undefined;
    if (domain.chainId === undefined || domain.chainId === null) {
      chainId = undefined;
    } else if (typeof domain.chainId === 'string') {
      chainId = parseInt(domain.chainId);
    } else if (typeof domain.chainId === 'number') {
      chainId = domain.chainId;
    } else if (typeof domain.chainId === 'bigint') {
      chainId = domain.chainId;
    } else if (
      typeof domain.chainId === 'object' &&
      'toNumber' in domain.chainId
    ) {
      // Handle ethers BigNumber
      chainId = (domain.chainId as any).toNumber();
    } else {
      // Fallback for other BigNumberish types
      chainId = Number(domain.chainId);
    }

    const viemDomain: ViemTypedDataDomain = {
      name: domain.name,
      version: domain.version,
      chainId,
      verifyingContract: domain.verifyingContract as `0x${string}`,
      salt: domain.salt as `0x${string}`,
    };

    // Convert ethers types to viem types
    const viemTypes: Record<string, readonly ViemTypedDataParameter[]> = {};
    for (const [key, value] of Object.entries(types)) {
      viemTypes[key] = value.map((field) => ({
        name: field.name,
        type: field.type,
      }));
    }

    return await this.viemAccount.signTypedData({
      domain: viemDomain,
      types: viemTypes,
      message,
      primaryType:
        Object.keys(viemTypes).find((key) => key !== 'EIP712Domain') ||
        'Message',
    });
  }

  async getBalance(): Promise<ethers.BigNumber> {
    if (!this.provider) {
      throw new Error('Provider is required for getBalance operation');
    }
    return await this.provider.getBalance(this.viemAccount.address);
  }

  async getTransactionCount(): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider is required for getTransactionCount operation');
    }
    return await this.provider.getTransactionCount(this.viemAccount.address);
  }

  async estimateGas(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<ethers.BigNumber> {
    if (!this.provider) {
      throw new Error('Provider is required for estimateGas operation');
    }
    return await this.provider.estimateGas(transaction);
  }

  async call(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider is required for call operation');
    }
    return await this.provider.call(transaction);
  }

  connect(provider: TacoProvider): TacoSigner {
    return new ViemTacoSigner(this.viemAccount, provider);
  }
}

/**
 * Create a TACo provider from viem PublicClient
 *
 * This function creates a TacoProvider directly from a viem client.
 */
export async function createTacoProvider(
  viemPublicClient: PublicClient,
): Promise<TacoProvider> {
  await checkViemAvailability();
  return new ViemTacoProvider(viemPublicClient);
}

/**
 * Create a TACo signer from viem Account
 *
 * This function creates a TacoSigner directly from a viem account.
 *
 * @param viemAccount - Viem account for signing operations
 * @param provider - Optional TACo provider. If not provided, some operations will require a provider
 */
export async function createTacoSigner(
  viemAccount: Account,
  provider?: TacoProvider,
): Promise<TacoSigner> {
  await checkViemAvailability();
  return new ViemTacoSigner(viemAccount, provider);
}

/**
 * Convenience function to create both provider and signer adapters from viem clients
 *
 * @param viemPublicClient - Viem public client for provider functionality
 * @param viemWalletClient - Viem wallet client for signing functionality
 * @returns Object with TACo provider and signer adapters
 */
export async function createTacoFromViem(
  viemPublicClient: PublicClient,
  viemWalletClient: WalletClient,
): Promise<{ provider: TacoProvider; signer: TacoSigner }> {
  await checkViemAvailability();

  if (!viemWalletClient.account) {
    throw new Error('Wallet client must have an account attached');
  }

  const provider = await createTacoProvider(viemPublicClient);
  const signer = await createTacoSigner(viemWalletClient.account, provider);

  return { provider, signer };
}
