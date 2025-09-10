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
 * import { type PublicClient } from '@nucypher/shared';
 *
 * // Use viem clients directly with TACo adapters
 * const tacoProvider = await toEthersProvider(viemPublicClient);
 * ```
 */

// Type helper: Use the real type from 'viem' if available, otherwise fallback to 'any'.
// This is because viem is an optional dependency, so the viem types may or may not be present.
// This pattern preserves type safety for consumers who have 'viem' installed, but does not break for others.
// See: https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1367016530
// Dynamic imports resolve to 'unknown' when module is not available, no compile-time errors occur
type _ViemPublicClient = import('viem').PublicClient;
type _ViemAccount = import('viem').Account;

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
