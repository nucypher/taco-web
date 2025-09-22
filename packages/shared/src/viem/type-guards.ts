import { ethers } from 'ethers';

import { ProviderLike, SignerLike } from '../types';

import { PublicClient, SignerAccount } from './types';

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
 * Type guard to determine if the signer is a viem account that can sign: LocalAccount or WalletClient
 * Note: might need modification when supporting viem SmartAccount
 * Checks for:
 * - Ensures it's not an ethers Signer instance
 * - Absence of ethers-specific properties (provider)
 * - Presence of viem Local Account properties (address as string) or viem Wallet Client properties (account.address as string)
 */
export function isViemSignerAccount(
  signer: SignerLike,
): signer is SignerAccount {
  if (signer instanceof ethers.Signer || 'provider' in signer) {
    return false;
  }

  // Check for viem Account properties
  const hasLocalAccountProperties =
    // Local Account:
    'address' in signer &&
    typeof (signer as { address: string }).address === 'string';
  const hasWalletClientProperties =
    // Wallet Client:
    'account' in signer &&
    typeof (signer as { account: { address: string } }).account.address ===
      'string';

  return hasLocalAccountProperties || hasWalletClientProperties;
}
