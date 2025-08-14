import {
  type Account,
  checkViemAvailability,
  type PublicClient,
  ViemProviderBase,
  ViemSignerBase,
} from '@nucypher/shared';

/**
 * A minimal provider that wraps viem PublicClient for auth provider compatibility
 *
 * This class extends ViemProviderBase and adds ethers.js specific formatting
 * for TACo authentication providers.
 */
class ViemAuthProvider extends ViemProviderBase {
  constructor(viemPublicClient: PublicClient) {
    super(viemPublicClient);
  }
}

/**
 * A signer that wraps viem Account for auth provider compatibility
 *
 * This class extends ViemSignerBase and adds ethers.js specific formatting
 * for TACo authentication providers.
 */
class ViemAuthSigner extends ViemSignerBase {
  constructor(viemAccount: Account, provider: ViemProviderBase) {
    super(viemAccount, provider);
  }

  connect(provider: ViemProviderBase): ViemSignerBase {
    return new ViemAuthSigner(this.viemAccount, provider);
  }
}

/**
 * Create a TACo-compatible provider from viem PublicClient
 *
 * Returns a provider based on ViemProviderBase with all
 * the methods needed for TACo authentication providers.
 */
export async function createEthersProvider(
  viemPublicClient: PublicClient,
): Promise<ViemProviderBase> {
  await checkViemAvailability();
  return new ViemAuthProvider(viemPublicClient);
}

/**
 * Create a TACo-compatible signer from viem Account
 *
 * Returns a signer based on ViemSignerBase with all
 * the methods needed for TACo authentication providers.
 */
export async function createEthersSigner(
  viemAccount: Account,
  provider: ViemProviderBase,
): Promise<ViemSignerBase> {
  await checkViemAvailability();
  return new ViemAuthSigner(viemAccount, provider);
}
