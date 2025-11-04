/**
 * AccessClient configuration types and utilities
 *
 * This module contains all configuration interfaces, type definitions, and utility functions
 * for configuring AccessClient instances with different blockchain client libraries (viem, ethers.js).
 */

import { DomainName, type PublicClient } from '@nucypher/shared';
import type { ethers } from 'ethers';

/**
 * Base configuration for AccessClient
 */
interface AccessClientBaseConfig {
  /** TACo domain name (e.g., 'lynx', 'tapir', 'mainnet') */
  domain: DomainName;
  /** Ritual ID for the TACo operations */
  ritualId: number;
  /** Optional Porter URIs */
  porterUris?: string[];
}

/**
 * Viem configuration for AccessClient
 */
export interface AccessClientViemConfig extends AccessClientBaseConfig {
  /** Viem PublicClient for blockchain operations */
  viemClient: PublicClient;
}

/**
 * Ethers configuration for AccessClient
 */
export interface AccessClientEthersConfig extends AccessClientBaseConfig {
  /** Ethers Provider for blockchain operations */
  ethersProvider: ethers.providers.Provider;
}

/**
 * Union type for AccessClient configuration - supports both viem and ethers.js
 */
export type AccessClientConfig =
  | AccessClientViemConfig
  | AccessClientEthersConfig;

/**
 * Type guard to check if config is viem-based
 * @param config - AccessClient configuration to check
 * @returns true if the configuration is for viem client
 */
export function isViemAccessClientConfig(
  config: AccessClientConfig,
): config is AccessClientViemConfig {
  return 'viemClient' in config;
}

/**
 * Type guard to check if config is ethers-based
 * @param config - AccessClient configuration to check
 * @returns true if the configuration is for ethers client
 */
export function isEthersAccessClientConfig(
  config: AccessClientConfig,
): config is AccessClientEthersConfig {
  return 'ethersProvider' in config;
}
