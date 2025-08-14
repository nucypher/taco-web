import {
  type Account,
  checkViemAvailability,
  type PublicClient,
  ViemProviderBase,
  ViemSignerBase,
} from '@nucypher/shared';
import { ethers } from 'ethers';

import { TacoAuthProvider, TacoAuthSigner } from './base-interfaces';

/**
 * A minimal provider that wraps viem PublicClient for auth provider compatibility
 *
 * This class extends ViemProviderBase and adds ethers.js specific formatting
 * for TACo authentication providers.
 */
class ViemAuthProvider extends ViemProviderBase implements TacoAuthProvider {
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
 * A signer that wraps viem Account for auth provider compatibility
 *
 * This class extends ViemSignerBase and adds ethers.js specific formatting
 * for TACo authentication providers.
 */
class ViemAuthSigner extends ViemSignerBase implements TacoAuthSigner {
  public override readonly provider: TacoAuthProvider;

  constructor(viemAccount: Account, provider: TacoAuthProvider) {
    super(viemAccount, provider);
    this.provider = provider;
  }

  connect(provider: TacoAuthProvider): TacoAuthSigner {
    return new ViemAuthSigner(this.viemAccount, provider);
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
