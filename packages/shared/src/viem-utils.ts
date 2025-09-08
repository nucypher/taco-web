/**
 * Shared viem utilities for TACo packages
 *
 * Features:
 * - Optional viem dependency handling with helpful error messages
 * - Dynamic import pattern that's webpack-compatible
 * - Centralized type definitions for viem objects
 * - Runtime availability checking with caching
 * - Common wrapper implementations for providers and signers
 *
 * Usage:
 * ```typescript
 * import { checkViemAvailability, type PublicClient } from '@nucypher/shared';
 *
 * // Use viem clients directly with TACo adapters
 * const tacoProvider = await createTacoProvider(viemPublicClient);
 * ```
 */

// Type helper: Use the real type from 'viem' if available, otherwise fallback to 'any'
// This pattern preserves type safety for consumers who have 'viem' installed, but does not break for others.
// See: https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1367016530
// Dynamic imports resolve to 'unknown' when module is not available, no compile-time errors occur
type _ViemPublicClient = import('viem').PublicClient;
type _ViemAccount = import('viem').Account;
type _ViemWalletClient = import('viem').WalletClient;
type _ViemBlock = import('viem').Block;
type _ViemTypedDataDomain = import('viem').TypedDataDomain;
type _ViemTypedDataParameter = import('viem').TypedDataParameter;

/**
 * Viem PublicClient type for read operations
 * @see https://viem.sh/docs/clients/public
 */
export type PublicClient = [unknown] extends [_ViemPublicClient]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : _ViemPublicClient;
/**
 * Viem Account type for signing operations
 * @see https://viem.sh/docs/accounts/privateKey
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Account = [unknown] extends [_ViemAccount] ? any : _ViemAccount;

/**
 * Viem WalletClient type for wallet operations
 * @see https://viem.sh/docs/clients/wallet
 */
export type WalletClient = [unknown] extends [_ViemWalletClient]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : _ViemWalletClient;

/**
 * Viem Block type for block operations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ViemBlock = [unknown] extends [_ViemBlock] ? any : _ViemBlock;

/**
 * Viem TypedDataDomain type for EIP-712 domain
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ViemTypedDataDomain = [unknown] extends [_ViemTypedDataDomain]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : _ViemTypedDataDomain;

/**
 * Viem TypedDataParameter type for EIP-712 parameters
 */
export type ViemTypedDataParameter = [unknown] extends [_ViemTypedDataParameter]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : _ViemTypedDataParameter;

// Internal state for tracking viem availability
let isViemAvailable = false;

/**
 * Check if viem is available and dynamically import it
 *
 * This function performs a dynamic import of viem to check availability.
 * It uses caching to avoid repeated imports and provides helpful error
 * messages when viem is not installed.
 *
 * @throws {Error} When viem is not installed with installation instructions
 * @example
 * ```typescript
 * try {
 *   await checkViemAvailability();
 *   // viem is available, safe to use viem functions
 * } catch (error) {
 *   console.error(error.message); // "viem is required..."
 * }
 * ```
 */
export async function checkViemAvailability(): Promise<void> {
  if (isViemAvailable) {
    return;
  }
  try {
    // Use direct string literal for webpack compatibility
    // This prevents "Critical dependency: the request of a dependency is an expression" warnings
    await import('viem');
    isViemAvailable = true;
  } catch (error) {
    throw new Error(
      'viem is required for viem wrapper functions. Install it with: npm install viem@^2.0.0',
    );
  }
}
