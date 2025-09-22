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
 * const tacoProvider = await toEthersProvider(publicClient);
 * ```
 */

// Type helper: Use the real type from 'viem' if available, otherwise fallback to 'any'.
// This is because viem is an optional dependency, so the viem types may or may not be present.
// This pattern preserves type safety for consumers who have 'viem' installed, but does not break for others.
// See: https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1367016530
// Dynamic imports resolve to 'unknown' when module is not available, no compile-time errors occur
type _Address = import('viem').Address;
type _ViemPublicClient = import('viem').PublicClient;
type _LocalAccount = import('viem').LocalAccount;
type _ViemChain = import('viem').Chain;
type _ViemTransport = import('viem').Transport;
type _WalletClient = import('viem').WalletClient;

/**
 * Viem Address type (`0x${string}`)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Address = [unknown] extends [_Address] ? any : _Address;

/**
 * Viem PublicClient type for read operations
 * @see https://viem.sh/docs/clients/public
 */
export type PublicClient = [unknown] extends [_ViemPublicClient]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : _ViemPublicClient;

export type LocalAccount = [unknown] extends [_LocalAccount]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : _LocalAccount;

export type WalletClient = [unknown] extends [_WalletClient]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : _WalletClient;

/**
 * Viem signer account type for signing operations (LocalAccount or WalletClient)
 * Note: SmartAccount is not supported yet
 * @see https://viem.sh/docs/accounts/local
 * @see https://viem.sh/docs/clients/wallet
 */
export type SignerAccount = LocalAccount | WalletClient;

/**
 * Viem Chain type for network metadata
 * @see https://viem.sh/docs/glossary/types#chain
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Chain = [unknown] extends [_ViemChain] ? any : _ViemChain;

/**
 * Viem Transport type for network metadata
 * @see https://viem.sh/docs/glossary/types#transport
 */
export type Transport = [unknown] extends [_ViemTransport]
  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  : _ViemTransport;
