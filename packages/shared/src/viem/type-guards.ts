import { ethers } from 'ethers';

import { ProviderLike, SignerLike } from '../types';

import { Account, PublicClient } from './types';

/**
 * Type guard to determine if the client is a viem PublicClient
 */
export function isViemClient(
  providerLike: ProviderLike,
): providerLike is PublicClient {
  const hasViemProperties = 'chain' in providerLike;
  const hasViemMethods =
    typeof (providerLike as { getChainId: () => Promise<number> })
      .getChainId === 'function';
  const isNotEthersProvider = !(
    providerLike instanceof ethers.providers.BaseProvider
  );

  return isNotEthersProvider && (hasViemProperties || hasViemMethods);
}

/**
 * Type guard to determine if the signer is a viem Account
 */
export function isViemAccount(signer: SignerLike): signer is Account {
  // Check for viem Account properties
  const hasViemAccountProperties =
    'address' in signer &&
    typeof (signer as { address: string }).address === 'string' &&
    !('provider' in signer); // ethers.Signer has provider property

  // Check if it's not an ethers.Signer
  const isNotEthersSigner = !(signer instanceof ethers.Signer);

  return isNotEthersSigner && hasViemAccountProperties;
}
