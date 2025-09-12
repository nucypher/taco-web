import { ethers } from 'ethers';

import { type TacoProvider } from '../taco-interfaces';
import { ProviderLike } from '../types';

import { isViemClient } from './type-guards';
import { type PublicClient } from './types';

/**
 * Viem TACo Provider
 *
 * This class implements the TacoProvider interface directly using viem clients.
 */
export class ViemTacoProvider implements TacoProvider {
  protected publicClient: PublicClient;

  // Ethers.js compatibility property for contract validation
  readonly _isProvider = true;
  readonly _network: Promise<ethers.providers.Network>;

  constructor(publicClient: PublicClient) {
    this.publicClient = publicClient;
    // Initialize network for ethers compatibility
    this._network = this.getNetwork();
  }

  async getNetwork(): Promise<ethers.providers.Network> {
    const chainId = await this.publicClient.getChainId();
    const name = this.publicClient.chain?.name || `chain-${chainId}`;
    return {
      name,
      chainId,
    };
  }

  async call(
    transaction: ethers.providers.TransactionRequest,
  ): Promise<string> {
    const result = await this.publicClient.call({
      to: transaction.to as `0x${string}`,
      data: transaction.data as `0x${string}`,
      value: transaction.value
        ? BigInt(transaction.value.toString())
        : undefined,
    });
    if (typeof result === 'object' && result && 'data' in result) {
      return result.data as string;
    }
    return result as string;
  }
}

/**
 * Create a TACo provider from viem PublicClient
 *
 * This function creates a TacoProvider directly from a viem client.
 */
export function toEthersProvider(
  providerLike: ProviderLike,
): ethers.providers.Provider {
  if (isViemClient(providerLike)) {
    return new ViemTacoProvider(
      providerLike,
    ) as unknown as ethers.providers.Provider;
  } else {
    return providerLike;
  }
}
