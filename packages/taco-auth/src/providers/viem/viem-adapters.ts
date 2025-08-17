import {
  type Account,
  checkViemAvailability,
  type PublicClient,
  ViemProviderBase,
  ViemSignerBase,
} from '@nucypher/shared';

/**
 * Minimal provider implementation for auth providers
 */
class ViemAuthProvider extends ViemProviderBase {
  constructor(viemPublicClient: PublicClient) {
    super(viemPublicClient);
  }
}

/**
 * Minimal signer implementation for auth providers  
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
export async function createTacoCompatibleProvider(
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
export async function createTacoCompatibleSigner(
  viemAccount: Account,
  provider: ViemProviderBase,
): Promise<ViemSignerBase> {
  await checkViemAvailability();
  return new ViemAuthSigner(viemAccount, provider);
}
