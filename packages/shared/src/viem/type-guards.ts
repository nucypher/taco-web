import { ethers } from 'ethers';

import { ProviderLike, SignerLike } from '../types';

import { Account, PublicClient } from './types';

/**
 * Type guard to determine if the provider-like is a viem PublicClient
 *
 * Checks for:
 * - Ensures it's not an ethers provider instance
 * - Presence of viem-specific properties (chain)
 * - Presence of viem-specific methods (getChainId)
 */
export function isViemClient(
  providerLike: ProviderLike,
): providerLike is PublicClient {
  // Early return if it's an ethers provider
  if (providerLike instanceof ethers.providers.BaseProvider) {
    return false;
  }

  // Check for viem-specific properties and methods
  const hasChainProperty = 'chain' in providerLike;
  const hasGetChainId =
    typeof (providerLike as { getChainId: () => Promise<number> })
      .getChainId === 'function';

  return hasChainProperty || hasGetChainId;
}

/**
 * Type guard to determine if the signer is a viem Account
 *
 * Checks for:
 * - Presence of viem Account properties (address as string)
 * - Absence of ethers-specific properties (provider)
 * - Ensures it's not an ethers Signer instance
 */
export function isViemAccount(signer: SignerLike): signer is Account {
  if (signer instanceof ethers.Signer) {
    return false;
  }

  // Check for viem Account signature:
  // - Has address property of type string
  // - Does NOT have provider property (ethers.Signer characteristic)
  return (
    'address' in signer &&
    typeof (signer as { address: string }).address === 'string' &&
    !('provider' in signer) // ethers.Signer has provider property
  );
}
