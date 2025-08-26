import { type Account, type PublicClient } from '@nucypher/shared';
import { ethers } from 'ethers';

import {
  EIP4361AuthProvider,
  EIP4361AuthProviderParams,
} from '../eip4361/eip4361';

import {
  createTacoProvider,
  createTacoSigner,
} from './viem-adapters';

/**
 * Viem-compatible EIP4361 authentication provider.
 *
 * This class provides a clean viem-native API for EIP4361 authentication
 * while internally handling the conversion to ethers.js objects that the
 * underlying EIP4361AuthProvider expects.
 * 
 * **Note**: This class uses a static factory method pattern for async
 * initialization. Use `ViemEIP4361AuthProvider.create()` instead of `new`.
 *
 * @example
 * ```typescript
 * import { createPublicClient, http } from 'viem';
 * import { privateKeyToAccount } from 'viem/accounts';
 * import { ViemEIP4361AuthProvider } from '@nucypher/taco-auth';
 *
 * const publicClient = createPublicClient({
 *   chain: polygon,
 *   transport: http()
 * });
 * const account = privateKeyToAccount('0x...');
 *
 * const authProvider = await ViemEIP4361AuthProvider.create(
 *   publicClient,
 *   account,
 *   { domain: 'my-app.com', uri: 'https://my-app.com' }
 * );
 *
 * const signature = await authProvider.getOrCreateAuthSignature();
 * ```
 */
export class ViemEIP4361AuthProvider {
  private ethersAuthProvider: EIP4361AuthProvider;

  /**
   * Private constructor - use create() static method instead
   */
  private constructor(ethersAuthProvider: EIP4361AuthProvider) {
    this.ethersAuthProvider = ethersAuthProvider;
  }

  /**
   * Create a new ViemEIP4361AuthProvider
   *
   * @param viemPublicClient - viem PublicClient for blockchain interactions
   * @param viemAccount - viem Account for signing operations
   * @param options - Optional EIP4361 parameters (domain, uri)
   */
  static async create(
    viemPublicClient: PublicClient,
    viemAccount: Account,
    options?: EIP4361AuthProviderParams,
  ): Promise<ViemEIP4361AuthProvider> {
    // Convert viem objects to ethers objects internally
    const ethersProvider = await createTacoProvider(viemPublicClient);
    const ethersSigner = await createTacoSigner(viemAccount, ethersProvider);

    // Create the underlying ethers auth provider
    // Type assertions are safe here because our TacoProvider/TacoSigner interfaces
    // are designed to be compatible with ethers Provider/Signer interfaces
    const ethersAuthProvider = new EIP4361AuthProvider(
      ethersProvider as unknown as ethers.providers.Provider,
      ethersSigner as unknown as ethers.Signer,
      options,
    );

    return new ViemEIP4361AuthProvider(ethersAuthProvider);
  }

  /**
   * Get or create authentication signature
   */
  async getOrCreateAuthSignature() {
    return this.ethersAuthProvider.getOrCreateAuthSignature();
  }

  /**
   * Get the underlying ethers auth provider (for advanced use cases)
   */
  get ethersProvider(): EIP4361AuthProvider {
    return this.ethersAuthProvider;
  }
}

// Export type for consumers
export type { EIP4361AuthProviderParams };
