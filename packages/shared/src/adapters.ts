import { ethers } from 'ethers';

import type { TACoSigner } from './taco-signer';
import { ProviderLike, SignerLike } from './types';
import { ViemEthersProviderAdapter } from './viem/ethers-adapter';
import { ViemSignerAdapter } from './viem/signer-adapter';
import { isViemAccount, isViemClient } from './viem/type-guards';

/**
 * Convert viem Account or ethers Signer to TACoSigner.
 *
 * This is the main entry point for creating signers for internal TACo use.
 * Unlike toEthersProvider which creates actual ethers objects,
 * this creates minimal adapters implementing only what TACo needs.
 *
 * @param signerLike - Either a viem Account or an ethers Signer
 * @returns A TACoSigner interface implementation
 */
export function toTACoSigner(signerLike: SignerLike): TACoSigner {
  if (isViemAccount(signerLike)) {
    return new ViemSignerAdapter(signerLike);
  } else {
    return signerLike;
  }
}

/**
 * Convert viem client to ethers provider or return existing ethers provider.
 *
 * This is the main entry point for converting providers.
 * It handles both viem clients (converting them to ethers providers)
 * and existing ethers providers (returning them unchanged).
 *
 * @param providerLike - Either a viem PublicClient or an ethers.providers.Provider
 * @returns An actual ethers.providers.Provider instance
 */
export function toEthersProvider(
  providerLike: ProviderLike,
): ethers.providers.Provider {
  if (isViemClient(providerLike)) {
    return ViemEthersProviderAdapter.clientToProvider(providerLike);
  } else {
    return providerLike;
  }
}
