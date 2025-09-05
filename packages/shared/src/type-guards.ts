import { ethers } from 'ethers';

import { Account, PublicClient } from './viem-utils';

/**
 * Type guard to determine if the client is a viem PublicClient
 */
export function isViemClient(
  client: ethers.providers.Provider | PublicClient,
): client is PublicClient {
  const hasViemProperties = 'chain' in client;
  const hasViemMethods =
    typeof (client as { getChainId: () => Promise<number> }).getChainId ===
    'function';
  const isNotEthersProvider = !(
    client instanceof ethers.providers.BaseProvider
  );

  return isNotEthersProvider && (hasViemProperties || hasViemMethods);
}

/**
 * Type guard to determine if the signer is a viem Account
 */
export function isViemAccount(
  signer: ethers.Signer | Account,
): signer is Account {
  // Check for viem Account properties
  const hasViemAccountProperties =
    'address' in signer &&
    typeof (signer as { address: string }).address === 'string' &&
    !('provider' in signer); // ethers.Signer has provider property

  // Check if it's not an ethers.Signer
  const isNotEthersSigner = !(signer instanceof ethers.Signer);

  return isNotEthersSigner && hasViemAccountProperties;
}

/**
 * Validate that provider and signer types are compatible
 */
export function validateProviderSignerCompatibility(
  providerOrClient: ethers.providers.Provider | PublicClient,
  signerOrAccount: ethers.Signer | Account,
): void {
  const isViemProvider = isViemClient(providerOrClient);
  const isViemSigner = isViemAccount(signerOrAccount);

  if (isViemProvider && !isViemSigner) {
    throw new Error(
      'Type mismatch: viem PublicClient provided but ethers.Signer detected. ' +
        'When using viem, please provide a viem Account. ' +
        'Use either: (ethers.Provider + ethers.Signer) or (viem.PublicClient + viem.Account)',
    );
  }

  if (!isViemProvider && isViemSigner) {
    throw new Error(
      'Type mismatch: ethers.Provider provided but viem Account detected. ' +
        'When using ethers, please provide an ethers.Signer. ' +
        'Use either: (ethers.Provider + ethers.Signer) or (viem.PublicClient + viem.Account)',
    );
  }
}
