import { ethers } from 'ethers';

import type { TacoSigner } from './taco-signer.js';
import { ProviderLike, SignerLike } from './types.js';
import { viemClientToProvider } from './viem/ethers-adapter.js';
import { ViemSignerAdapter } from './viem/signer-adapter.js';
import { isViemClient, isViemSignerAccount } from './viem/type-guards.js';

/**
 * Convert ethers Signer or viem SignerAccount (LocalAccount or WalletClient) to TacoSigner.
 *
 * This is the main entry point for creating signers for internal TACo use.
 * Unlike toEthersProvider which creates actual ethers objects,
 * this creates minimal adapters implementing only what TACo needs.
 *
 * @param signerLike - Either an ethers Signer or a viem SignerAccount (LocalAccount or WalletClient)
 * @returns A TacoSigner interface implementation
 */
export function toTacoSigner(signerLike: SignerLike): TacoSigner {
  if (isViemSignerAccount(signerLike)) {
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
