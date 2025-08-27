import {
  type Account,
  checkViemAvailability,
  type PublicClient,
  type TacoProvider,
  type TacoSigner,
  ViemProviderBase,
  ViemSignerBase,
  type ViemTypedDataDomain,
  type ViemTypedDataParameter,
} from '@nucypher/shared';
import { ethers } from 'ethers';

/**
 * Viem adapter for TACo Auth Provider
 *
 * This adapter implements the TacoProvider interface using viem wrappers
 * specifically for authentication operations.
 */
class ViemTacoAuthProviderAdapter implements TacoProvider {
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
 * Viem adapter for TACo Auth Signer
 *
 * This adapter implements the TacoSigner interface using viem wrappers
 * specifically for authentication operations.
 */
class ViemTacoAuthSignerAdapter implements TacoSigner {
  private readonly viemWrapper: ViemSignerBase;
  public readonly provider: TacoProvider;

  // Ethers.js compatibility property for contract validation
  readonly _isSigner = true;

  constructor(viemWrapper: ViemSignerBase, provider: TacoProvider) {
    this.viemWrapper = viemWrapper;
    this.provider = provider;
  }

  async getAddress() {
    return this.viemWrapper.getAddress();
  }

  async signMessage(message: string | Uint8Array) {
    return this.viemWrapper.signMessage(message);
  }

  async signTypedData(
    domain: ViemTypedDataDomain,
    types: Record<string, readonly ViemTypedDataParameter[]>,
    message: Record<string, unknown>,
  ): Promise<string> {
    return this.viemWrapper.signTypedData(domain, types, message);
  }

  async getBalance() {
    return this.viemWrapper.getBalance();
  }

  async getTransactionCount() {
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
    if (!(provider instanceof ViemTacoAuthProviderAdapter)) {
      throw new Error('Provider must be a ViemTacoAuthProviderAdapter');
    }
    const newViemWrapper = this.viemWrapper.connect(provider['viemWrapper']);
    return new ViemTacoAuthSignerAdapter(newViemWrapper, provider);
  }
}

/**
 * Concrete viem provider wrapper implementation for auth
 */
class ConcreteViemAuthProvider extends ViemProviderBase {
  constructor(viemPublicClient: PublicClient) {
    super(viemPublicClient);
  }
}

/**
 * Concrete viem signer wrapper implementation for auth
 */
class ConcreteViemAuthSigner extends ViemSignerBase {
  constructor(viemAccount: Account, provider: ViemProviderBase) {
    super(viemAccount, provider);
  }

  connect(provider: ViemProviderBase): ViemSignerBase {
    return new ConcreteViemAuthSigner(this['viemAccount'], provider);
  }
}

/**
 * Create a TACo auth provider adapter from viem PublicClient
 */
export async function createTacoProvider(
  viemPublicClient: PublicClient,
): Promise<TacoProvider> {
  await checkViemAvailability();
  const viemWrapper = new ConcreteViemAuthProvider(viemPublicClient);
  return new ViemTacoAuthProviderAdapter(viemWrapper);
}

/**
 * Create a TACo auth signer adapter from viem Account
 */
export async function createTacoSigner(
  viemAccount: Account,
  provider: TacoProvider,
): Promise<TacoSigner> {
  await checkViemAvailability();

  if (!(provider instanceof ViemTacoAuthProviderAdapter)) {
    throw new Error('Provider must be a ViemTacoAuthProviderAdapter');
  }

  const viemWrapper = new ConcreteViemAuthSigner(
    viemAccount,
    provider['viemWrapper'],
  );
  return new ViemTacoAuthSignerAdapter(viemWrapper, provider);
}
