/**
 * TACo Domain Configuration and Validation
 *
 * This module provides domain configuration management, validation utilities,
 * and configuration processing for TACo operations across different networks.
 */

import {
  DomainName,
  DOMAINS,
  isViemClient,
  ProviderLike,
} from '@nucypher/shared';
import { ethers } from 'ethers';
import type { PublicClient } from 'viem';

import {
  type AccessClientConfig,
  isEthersAccessClientConfig,
  isViemAccessClientConfig,
} from './index.js';

/**
 * Generic validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Access Configuration Validator
 *
 * Validates Access client configurations, domains, and provider compatibility.
 * Provides both fast and full validation methods for TACo operations.
 */
export class AccessConfigValidator {
  /**
   * Get all supported TACo domain names
   * @returns {DomainName[]} Array of supported TACo domain names ('lynx', 'tapir', 'mainnet')
   */
  static getSupportedDomains(): DomainName[] {
    return Object.values(DOMAINS).map((domain) => domain.domain);
  }

  /**
   * Check if domain is valid
   * @param {DomainName} domain - TACo domain name to check ('lynx', 'tapir', 'mainnet')
   * @returns {boolean} True if domain exists
   */
  static isValidDomain(domain: DomainName): boolean {
    return !!domain && this.getSupportedDomains().includes(domain);
  }

  /**
   * Get expected chain ID for domain from DOMAINS configuration
   * @param {DomainName} domain - Domain name to look up
   * @returns {number | undefined} Chain ID for the domain, undefined if not found
   * @private
   */
  private static getExpectedChainId(domain: DomainName): number | undefined {
    const domainEntry = Object.values(DOMAINS).find(
      (domainConfig) => domainConfig.domain === domain,
    );
    return domainEntry?.chainId;
  }

  /**
   * Validate ritual ID (basic validation - positive integer or 0)
   * @param {number} ritualId - Ritual ID to validate
   * @returns {boolean} True if valid (positive integer or 0)
   */
  static isValidRitualId(ritualId: number): boolean {
    return (
      typeof ritualId === 'number' &&
      Number.isInteger(ritualId) &&
      ritualId >= 0
    );
  }

  /**
   * Validate provider compatibility with domain
   * @param {DomainName} domain - Domain name
   * @param {ProviderLike} provider - Provider to validate (ethers Provider or viem PublicClient)
   * @returns {Promise<boolean>} True if provider is valid for domain
   */
  static async isValidProvider(
    domain: DomainName,
    provider: ProviderLike,
  ): Promise<boolean> {
    let chainId: number;

    if (!provider || typeof provider !== 'object') {
      // Invalid provider
      return false;
    }

    // Try to detect provider type and get chain ID safely
    try {
      if (isViemClient(provider)) {
        chainId = await (provider as PublicClient).getChainId();
      } else {
        const network = await (
          provider as ethers.providers.Provider
        ).getNetwork();
        chainId = network.chainId;
      }
    } catch (error) {
      // Error getting chain ID
      return false;
    }

    // Check if the provider's chain ID matches the domain's expected chain ID
    return (
      Object.values(DOMAINS).find(
        (domainInfo) =>
          domainInfo.domain === domain && domainInfo.chainId === chainId,
      ) !== undefined
    );
  }

  /**
   * Fast validation (everything except provider network checks)
   *
   * Performs synchronous validation of configuration including:
   * - Domain name validation
   * - Ritual ID validation to ensure it is a positive integer
   * - Provider/signer presence validation
   * - Chain compatibility check (if chain info is available synchronously)
   *
   * @param {TacoClientConfig} config - Configuration to validate
   * @returns {ValidationResult} Validation result with isValid boolean and errors array
   */
  static validateFast(config: AccessClientConfig): ValidationResult {
    const errors: string[] = [];

    // Validate domain
    if (!config.domain) {
      errors.push('The property `domain` is required');
    } else if (!this.isValidDomain(config.domain)) {
      errors.push(
        `Invalid domain name: ${config.domain}. Supported domains: ${this.getSupportedDomains().join(', ')}`,
      );
    }

    // Validate ritual ID
    if (!config.ritualId) {
      errors.push('The property `ritualId` is required');
    } else if (!this.isValidRitualId(config.ritualId)) {
      errors.push(
        `Invalid ritual ID: ${config.ritualId} for domain ${config.domain}`,
      );
    }

    // Validate blockchain client configuration
    if (isViemAccessClientConfig(config)) {
      // Viem configuration
      if (!config.viemClient) {
        errors.push('viemClient is required for viem configuration');
      }
    } else if (isEthersAccessClientConfig(config)) {
      // Ethers configuration
      if (!config.ethersProvider) {
        errors.push('ethersProvider is required for ethers configuration');
      }
    } else {
      errors.push(
        'Configuration must include either viemClient or ethersProvider',
      );
    }

    // Validate chain compatibility (synchronous check)
    const chainValidation = this.validateChainCompatibility(config);
    if (!chainValidation.isValid) {
      errors.push(...chainValidation.errors);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Synchronous chain compatibility validation
   *
   * Validates provider chain compatibility with domain requirements using
   * synchronously available chain information.
   *
   * @param {TacoClientConfig} config - Configuration to validate
   * @returns {ValidationResult} Validation result
   * @private
   */
  private static validateChainCompatibility(
    config: AccessClientConfig,
  ): ValidationResult {
    const errors: string[] = [];

    // Get expected chain ID for domain
    const expectedChainId = this.getExpectedChainId(config.domain);
    if (!expectedChainId) {
      errors.push(`Unsupported domain: ${config.domain}`);
      return { isValid: false, errors };
    }

    if (isViemAccessClientConfig(config) && config.viemClient) {
      // Note: If viemClient.chain is undefined, we skip synchronous validation
      // Full validation with validateFull() will perform the network check
      const viemClient = config.viemClient as PublicClient;
      if (viemClient.chain && viemClient.chain.id !== expectedChainId) {
        errors.push(
          `Provider chain mismatch: viem client chain ID ${viemClient.chain.id} does not match domain '${config.domain}' (expected ${expectedChainId})`,
        );
      }
    } // No need to count for the other cases. The caller methods already handle them.

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Full validation including async provider network checks
   *
   * Performs comprehensive validation including:
   * - All fast validation checks
   * - Async network calls to verify provider chain ID matches domain requirements
   *
   * Use this method when you need complete validation including network connectivity checks.
   * For faster validation without network calls, use validateFast().
   *
   * @param {TacoClientConfig} config - Configuration to validate
   * @returns {Promise<ValidationResult>} Promise resolving to validation result with isValid boolean and errors array
   */
  static async validate(config: AccessClientConfig): Promise<ValidationResult> {
    // First run fast validation
    const fastResult = this.validateFast(config);
    if (!fastResult.isValid) {
      return fastResult;
    }

    const errors: string[] = [];

    // Additional async provider validation
    let provider: PublicClient | ethers.providers.Provider | undefined;

    if (isViemAccessClientConfig(config)) {
      provider = config.viemClient;
    } else if (isEthersAccessClientConfig(config)) {
      provider = config.ethersProvider;
    }

    // Validate provider compatibility with domain (if both exist)
    if (provider && config.domain) {
      const isValidProvider = await this.isValidProvider(
        config.domain,
        provider,
      );
      if (!isValidProvider) {
        errors.push(
          `Invalid provider for domain: ${config.domain}. Provider chain ID does not match domain requirements.`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
