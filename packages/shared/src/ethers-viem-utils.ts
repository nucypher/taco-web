import { ethers } from 'ethers';

import { type TacoProvider, type TacoSigner } from './taco-interfaces';
import { isViemAccount, isViemClient } from './type-guards';
import { ProviderLike, SignerLike } from './types';
import { type Account, type PublicClient } from './viem-types';

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
  public provider?: ethers.providers.Provider | undefined;

  constructor(viemAccount: Account, provider?: ProviderLike | undefined) {
    this.viemAccount = viemAccount;
    if (provider) {
      this.provider = toEthersProvider(provider);
    }
  }

  async getAddress(): Promise<string> {
    return this.viemAccount.address;
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    if (!this.viemAccount.signMessage) {
      throw new Error('Account does not support message signing');
    }
    const messageToSign =
      typeof message === 'string' ? message : ethers.utils.hexlify(message);
    return await this.viemAccount.signMessage({ message: messageToSign });
  }

  connect(provider: ethers.providers.Provider): ethers.Signer {
    this.provider = provider;
    return this as unknown as ethers.Signer;
  }
}

/**
 * Create a TACo provider from viem PublicClient
 *
 * This function creates a TacoProvider directly from a viem client.
 */
export function toEthersProvider(
  provider: ProviderLike,
): ethers.providers.Provider {
  if (isViemClient(provider)) {
    return new ViemTacoProvider(
      provider,
    ) as unknown as ethers.providers.Provider;
  } else {
    return provider;
  }
}

/**
 * Create a TACo signer from viem Account
 *
 * This function creates a TacoSigner directly from a viem account.
 *
 * @param viemAccount - Viem account for signing operations
 * @param provider - Optional TACo provider. If not provided, some operations will require a provider
 */
export function toEthersSigner(
  signerLike: SignerLike,
  provider?: ProviderLike,
): ethers.Signer {
  const providerAdapter = provider ? toEthersProvider(provider) : undefined;
  if (isViemAccount(signerLike)) {
    return new ViemTacoSigner(
      signerLike,
      providerAdapter,
    ) as unknown as ethers.Signer;
  } else {
    return signerLike as unknown as ethers.Signer;
  }
}
