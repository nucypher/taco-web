import {
  type Account,
  checkViemAvailability,
  type PublicClient,
  ViemProviderBase,
  ViemSignerBase,
  type WalletClient,
} from '@nucypher/shared';
import { ethers } from 'ethers';

import { TacoProvider, TacoSigner } from './base-interfaces';

/**
 * A provider that wraps viem PublicClient for TACo SDK compatibility
 *
 * This class extends ViemProviderBase and adds ethers.js specific formatting
 * for the TACo SDK requirements.
 */
class ViemTacoProvider extends ViemProviderBase implements TacoProvider {
  // Override network type for ethers compatibility
  override readonly _network: Promise<ethers.providers.Network>;
  override readonly _networkPromise?: Promise<ethers.providers.Network>;

  constructor(viemPublicClient: PublicClient) {
    super(viemPublicClient);
    // Initialize network for ethers compatibility with correct type
    this._network = this.getNetwork();
    this._networkPromise = this._network;
  }

  override async getNetwork(): Promise<ethers.providers.Network> {
    return await this.getEthersNetwork();
  }

  // Base class now handles ethers.BigNumber conversion and common methods directly
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
 * This class extends ViemSignerBase and adds ethers.js specific formatting
 * for the TACo SDK requirements.
 */
class ViemTacoSigner extends ViemSignerBase implements TacoSigner {
  public override readonly provider: TacoProvider;

  constructor(viemAccount: Account, provider: TacoProvider) {
    super(viemAccount, provider);
    this.provider = provider;
  }

  connect(provider: TacoProvider): TacoSigner {
    return new ViemTacoSigner(this.viemAccount, provider);
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
