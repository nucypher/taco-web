import { EIP4361AuthProvider, EIP4361AuthProviderParams } from '../eip4361/eip4361';

import { createEthersProvider, createEthersSigner } from './viem-wrappers';

// Dynamic viem types (available only when viem is installed)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Account = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PublicClient = any;

/**
 * Viem-compatible EIP4361 authentication provider.
 * 
 * This class provides a clean viem-native API for EIP4361 authentication
 * while internally handling the conversion to ethers.js objects that the
 * underlying EIP4361AuthProvider expects.
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
 * const authProvider = new ViemEIP4361AuthProvider(
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
   * Create a new ViemEIP4361AuthProvider
   * 
   * @param viemPublicClient - viem PublicClient for blockchain interactions
   * @param viemAccount - viem Account for signing operations
   * @param options - Optional EIP4361 parameters (domain, uri)
   */
  constructor(
    viemPublicClient: PublicClient,
    viemAccount: Account,
    options?: EIP4361AuthProviderParams
  ) {
    // Convert viem objects to ethers objects internally
    const ethersProvider = createEthersProvider(viemPublicClient);
    const ethersSigner = createEthersSigner(viemAccount, ethersProvider);

    // Create the underlying ethers auth provider
    this.ethersAuthProvider = new EIP4361AuthProvider(
      ethersProvider,
      ethersSigner,
      options
    );
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
