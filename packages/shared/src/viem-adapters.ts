import { ethers, TypedDataDomain, TypedDataField } from 'ethers';

import { type TacoProvider, type TacoSigner } from './taco-interfaces';
import {
  type Account,
  checkViemAvailability,
  type PublicClient,
  ViemProviderBase,
  ViemSignerBase,
  type ViemTypedDataDomain,
  type ViemTypedDataParameter,
  type WalletClient,
} from './viem-utils';

/**
 * Unified Viem Provider Adapter
 *
 * This adapter implements the TacoProvider interface using viem wrappers.
 * It bridges the gap between viem and ethers.js interfaces.
 * Used by both taco and taco-auth packages to avoid code duplication.
 */
export class ViemProviderAdapter implements TacoProvider {
  private readonly viemWrapper: ViemProviderBase;

  // Ethers.js compatibility property for contract validation
  readonly _isProvider = true;

  constructor(viemWrapper: ViemProviderBase) {
    this.viemWrapper = viemWrapper;
  }

  async getNetwork(): Promise<ethers.providers.Network> {
    return this.viemWrapper.getNetwork();
  }

  async call(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<string> {
    return this.viemWrapper.call(transaction);
  }

  async getBlockNumber(): Promise<number> {
    return this.viemWrapper.getBlockNumber();
  }

  async getBalance(
    address: string,
    blockTag?: string | number,
  ): Promise<ethers.BigNumber> {
    return this.viemWrapper.getBalance(address, blockTag);
  }

  async getTransactionCount(address: string): Promise<number> {
    return this.viemWrapper.getTransactionCount(address);
  }

  async getCode(address: string): Promise<string | undefined> {
    return this.viemWrapper.getCode(address);
  }

  async estimateGas(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<ethers.BigNumber> {
    return this.viemWrapper.estimateGas(transaction);
  }

  async getGasPrice(): Promise<ethers.BigNumber> {
    return this.viemWrapper.getGasPrice();
  }

  async getFeeData(): Promise<ethers.providers.FeeData> {
    return this.viemWrapper.getFeeData();
  }

  async resolveName(name: string): Promise<string | null> {
    return this.viemWrapper.resolveName(name);
  }

  async lookupAddress(address: string): Promise<string | null> {
    return this.viemWrapper.lookupAddress(address);
  }
}

/**
 * Unified Viem Signer Adapter
 *
 * This adapter implements the TacoSigner interface using viem wrappers.
 * It bridges the gap between viem and ethers.js interfaces.
 * Used by both taco and taco-auth packages to avoid code duplication.
 */
class ViemSignerAdapter implements TacoSigner {
  private readonly viemWrapper: ViemSignerBase;
  public readonly provider?: TacoProvider | undefined;

  // Ethers.js compatibility property for contract validation
  readonly _isSigner = true;

  constructor(viemWrapper: ViemSignerBase, provider?: TacoProvider | undefined) {
    this.viemWrapper = viemWrapper;
    this.provider = provider;
  }

  async getAddress(): Promise<string> {
    return this.viemWrapper.getAddress();
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    return this.viemWrapper.signMessage(message);
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    message: Record<string, unknown>,
  ): Promise<string> {
    // Convert ethers types to viem types for compatibility
    const viemDomain = domain as unknown as ViemTypedDataDomain;
    const viemTypes = types as unknown as Record<
      string,
      readonly ViemTypedDataParameter[]
    >;
    return this.viemWrapper.signTypedData(viemDomain, viemTypes, message);
  }

  async getBalance(): Promise<ethers.BigNumber> {
    return this.viemWrapper.getBalance();
  }

  async getTransactionCount(): Promise<number> {
    return this.viemWrapper.getTransactionCount();
  }

  async estimateGas(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<ethers.BigNumber> {
    return this.viemWrapper.estimateGas(transaction);
  }

  async call(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<string> {
    return this.viemWrapper.call(transaction);
  }

  connect(provider: TacoProvider): TacoSigner {
    // For viem adapters, we need to create a new signer with the new provider
    if (!(provider instanceof ViemProviderAdapter)) {
      throw new Error('Provider must be a ViemProviderAdapter');
    }
    const newViemWrapper = this.viemWrapper.connect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (provider as any).viemWrapper,
    );
    return new ViemSignerAdapter(newViemWrapper, provider);
  }
}

/**
 * Concrete viem provider wrapper implementation
 */
export class ConcreteViemProvider extends ViemProviderBase {
  constructor(viemPublicClient: PublicClient) {
    super(viemPublicClient);
  }
}

/**
 * Concrete viem signer wrapper implementation
 */
class ConcreteViemSigner extends ViemSignerBase {
  constructor(viemAccount: Account, provider?: ViemProviderBase | undefined) {
    super(viemAccount, provider);
  }

  connect(provider?: ViemProviderBase | undefined): ViemSignerBase {
    return new ConcreteViemSigner(this['viemAccount'], provider);
  }
}

/**
 * Create a TACo provider adapter from viem PublicClient
 *
 * This function creates a viem wrapper and then wraps it in a TacoProvider adapter.
 */
export async function createTacoProvider(
  viemPublicClient: PublicClient,
): Promise<TacoProvider> {
  await checkViemAvailability();
  const viemWrapper = new ConcreteViemProvider(viemPublicClient);
  return new ViemProviderAdapter(viemWrapper);
}

/**
 * Create a TACo signer adapter from viem Account
 *
 * This function creates a viem wrapper and then wraps it in a TacoSigner adapter.
 * 
 * @param viemAccount - Viem account for signing operations
 * @param provider - Optional TACo provider. If not provided, a minimal provider will be created for signing-only operations
 */
export async function createTacoSigner(
  viemAccount: Account,
  provider?: TacoProvider,
): Promise<TacoSigner>;
export async function createTacoSigner(
  viemAccount: Account,
): Promise<TacoSigner>;
export async function createTacoSigner(
  viemAccount: Account,
  provider?: TacoProvider,
): Promise<TacoSigner> {
  await checkViemAvailability();

  // If provider is provided, validate it's a ViemProviderAdapter
  if (provider && !(provider instanceof ViemProviderAdapter)) {
    throw new Error('Provider must be a ViemProviderAdapter');
  }

  const viemWrapper = new ConcreteViemSigner(
    viemAccount,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provider ? (provider as any).viemWrapper : undefined,
  );
  return new ViemSignerAdapter(viemWrapper, provider);
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
