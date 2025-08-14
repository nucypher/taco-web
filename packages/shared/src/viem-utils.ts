/**
 * Shared viem utilities for TACo packages
 *
 * This module provides consistent viem integration utilities across all TACo packages,
 * eliminating code duplication while maintaining clean architecture.
 *
 * Features:
 * - Optional viem dependency handling with helpful error messages
 * - Dynamic import pattern that's webpack-compatible
 * - Centralized type definitions for viem objects
 * - Runtime availability checking with caching
 *
 * Usage:
 * ```typescript
 * import { checkViemAvailability, type PublicClient } from '@nucypher/shared';
 *
 * async function myViemFunction(client: PublicClient) {
 *   await checkViemAvailability(); // Ensures viem is available
 *   // ... use viem functionality
 * }
 * ```
 */

// Dynamic type definitions for viem objects
// Using 'any' types to avoid compile-time viem dependency
// These will be properly typed when viem is actually imported

/**
 * Viem PublicClient type for read operations
 * @see https://viem.sh/docs/clients/public
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PublicClient = any;

/**
 * Viem Account type for signing operations
 * @see https://viem.sh/docs/accounts/privateKey
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Account = any;

/**
 * Viem WalletClient type for wallet operations
 * @see https://viem.sh/docs/clients/wallet
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WalletClient = any;

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
      'viem is required for viem wrapper functions. Install it with: npm install viem',
    );
  }
}
