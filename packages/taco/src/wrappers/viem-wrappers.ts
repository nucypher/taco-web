import {
  type Account,
  checkViemAvailability,
  type PublicClient,
  ViemProviderBase,
  ViemSignerBase,
  type WalletClient,
} from '@nucypher/shared';

/**
 * A provider that wraps viem PublicClient for TACo SDK compatibility
 *
 * This class extends ViemProviderBase and adds ethers.js specific formatting
 * for the TACo SDK requirements.
 */
class ViemTacoProvider extends ViemProviderBase {
  constructor(viemPublicClient: PublicClient) {
    super(viemPublicClient);
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
): Promise<ViemProviderBase> {
  await checkViemAvailability();
  return new ViemTacoProvider(viemPublicClient);
}

/**
 * A signer that wraps viem Account for TACo SDK compatibility
 *
 * This class extends ViemSignerBase and adds ethers.js specific formatting
 * for the TACo SDK requirements.
 */
class ViemTacoSigner extends ViemSignerBase {
  constructor(viemAccount: Account, provider: ViemProviderBase) {
    super(viemAccount, provider);
  }

  connect(provider: ViemProviderBase): ViemSignerBase {
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
  provider: ViemProviderBase,
): Promise<ViemSignerBase> {
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
): Promise<{ provider: ViemProviderBase; signer: ViemSignerBase }> {
  await checkViemAvailability();

  if (!viemWalletClient.account) {
    throw new Error('Wallet client must have an account attached');
  }

  const provider = await createEthersProvider(viemPublicClient);
  const signer = await createEthersSigner(viemWalletClient.account, provider);

  return { provider, signer };
}
