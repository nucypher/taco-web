import { ethers } from 'ethers';

import type { TacoSigner } from './taco-signer';
import { ProviderLike, SignerLike } from './types';
import { viemClientToProvider } from './viem/ethers-adapter';
import { ViemSignerAdapter } from './viem/signer-adapter';
import { isViemAccount, isViemClient } from './viem/type-guards';

/**
 * Convert viem Account or ethers Signer to TacoSigner.
 *
 * This is the main entry point for creating signers for internal TACo use.
 * Unlike toEthersProvider which creates actual ethers objects,
 * this creates minimal adapters implementing only what TACo needs.
 *
 * @param signerLike - Either a viem Account or an ethers Signer
 * @returns A TacoSigner interface implementation
 */
export function toTacoSigner(signerLike: SignerLike): TacoSigner {
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
    return viemClientToProvider(providerLike);
  } else {
    return providerLike;
  }
}
