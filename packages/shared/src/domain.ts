export type DomainName = 'lynx' | 'tapir' | 'mainnet';

/**
 * TACo domain configuration with essential network data
 *
 * Contains domain names, chain IDs, and core infrastructure information
 * needed for TACo operations across different networks.
 *
 * @example
 * ```typescript
 * // Get domain information
 * const lynxInfo = DOMAINS.DEVNET;
 * console.log(lynxInfo.domain); // 'lynx'
 * console.log(lynxInfo.chainId); // 80002
 * ```
 */
export const DOMAINS = {
  // lynx - DEVNET: Bleeding-edge developer network
  DEVNET: {
    domain: 'lynx',
    chainId: 80002,
  },
  // tapir - TESTNET: Stable testnet for current TACo release
  TESTNET: {
    domain: 'tapir',
    chainId: 80002,
  },
  // mainnet - MAINNET: Production network
  MAINNET: {
    domain: 'mainnet',
    chainId: 137,
  },
} as const;

/**
 * TACo Domain Name Constants
 *
 * Convenient constants for referencing TACo domain names in a type-safe manner.
 * Use these constants instead of hardcoded strings for better maintainability.
 */
export const DOMAIN_NAMES = {
  /** DEVNET domain ('lynx') - Bleeding-edge developer network */
  DEVNET: 'lynx',
  /** TESTNET domain ('tapir') - Stable testnet for current TACo release */
  TESTNET: 'tapir',
  /** MAINNET domain ('mainnet') - Production network */
  MAINNET: 'mainnet',
} as const;
