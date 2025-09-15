import { ethers } from 'ethers';

import { ProviderLike } from '../types';

import { isViemClient } from './type-guards';
import type { Chain, PublicClient } from './types';

/**
 * Viem to Ethers.js Adapter for Providers
 *
 * This adapter converts viem PublicClients to actual ethers.js Provider instances.
 * Unlike the signer adapter which implements a minimal internal interface,
 * this creates real ethers.providers.Provider objects that can be passed to
 * third-party libraries expecting ethers.js providers.
 *
 * Key differences from signer adapter:
 * - Creates ethers.providers.Provider instances
 * - Currently handles only transport type: http
 * - Required for external library compatibility
 */
export class ViemEthersProviderAdapter {
  private readonly client: PublicClient;

  constructor(client: PublicClient) {
    this.client = client;
  }

  /**
   * Convert viem client to ethers.js provider
   * Returns an actual ethers.providers.Provider instance for use with external libraries
   */
  toEthersProvider(): ethers.providers.Provider {
    const { chain, transport }: PublicClient = this.client;

    if (!chain) {
      throw new Error('Client must have a chain configured');
    }

    const networkish = this.createNetworkish(chain);

    // Note: We read minimal, commonly-present properties from transport.
    // viem's transport internals are not a public API and may change.
    // Also the we are taking only the first transport available.
    // This adapter focuses on best-effort extraction of an RPC URL or EIP-1193 provider.

    // fallback transport (multiple RPC endpoints)
    if (transport?.type === 'fallback') {
      throw new Error('Fallback transport not supported');
      // TODO: implement with a code like the following:
      // Note: The following takes only the first url of the transports urls.
      // const items = transport.transports as ReturnType<Transport>[];
      // const providers = items.map((t, i) => {
      //   const url = t?.value?.url;
      //   if (typeof url !== 'string' || url.length === 0) {
      //     throw new Error(
      //       `Fallback transport missing URL at index ${i} (chainId=${chain?.id ?? 'unknown'} name=${chain?.name ?? 'unknown'})`,
      //     );
      //   }
      //   return new ethers.providers.JsonRpcProvider(url, networkish);
      // });

      // return new ethers.providers.FallbackProvider(providers);
    }

    // websocket transport
    if (transport?.type === 'webSocket') {
      throw new Error('WebSocket transport not supported');
      // TODO: implement with a code like the following:
      // const url = transport?.url as string | undefined;
      // if (!url) {
      //   throw new Error(
      //     `Transport must have a URL (type=webSocket, chainId=${chain?.id ?? 'unknown'} name=${chain?.name ?? 'unknown'})`,
      //   );
      // }
      // return new ethers.providers.WebSocketProvider(url, networkish);
    }

    // custom (EIP-1193) transport
    if (transport?.type === 'custom') {
      const value = transport?.value;
      const provider = value?.provider ?? value;

      // Check if it's an EIP-1193 provider (e.g., MetaMask, WalletConnect)
      if (provider && typeof provider.request === 'function') {
        return new ethers.providers.Web3Provider(provider, networkish);
      }

      // If custom but no EIP-1193 provider found, try URL if present

      throw new Error('Custom non-EIP-1193 provider transport not supported');
      // TODO: implement with a code like the following:
      // const url = value?.url ?? transport?.url;
      // if (typeof url === 'string' && url.length > 0) {
      //   return new ethers.providers.JsonRpcProvider(url, networkish);
      // }
      // throw new Error(
      //   `Custom transport missing EIP-1193 provider or URL (chainId=${chain?.id ?? 'unknown'} name=${chain?.name ?? 'unknown'})`,
      // );
    }

    // Default: assume HTTP-like with a URL
    const url = transport?.url as string | undefined;
    if (!url) {
      throw new Error(
        `Transport must have a URL (type=${transport?.type ?? 'unknown'}, chainId=${chain?.id ?? 'unknown'} name=${chain?.name ?? 'unknown'})`,
      );
    }
    return new ethers.providers.JsonRpcProvider(url, networkish);
  }

  /**
   * Get the current viem client
   */
  getViemClient(): PublicClient {
    return this.client;
  }

  /**
   * Create ethers network object from viem chain
   */
  private createNetworkish(chain: Chain): ethers.providers.Networkish {
    const networkish: {
      chainId: number;
      name: string;
      ensAddress?: string;
    } = {
      chainId: chain.id,
      name: chain.name,
    };

    // Add ENS registry address if available
    if (chain.contracts?.ensRegistry?.address) {
      networkish.ensAddress = chain.contracts.ensRegistry.address;
    }

    return networkish;
  }

  /**
   * Static factory method to create adapter from viem client
   */
  static from(client: PublicClient): ViemEthersProviderAdapter {
    return new ViemEthersProviderAdapter(client);
  }

  /**
   * Static method to directly convert client to provider (convenience method)
   */
  static clientToProvider(client: PublicClient): ethers.providers.Provider {
    return new ViemEthersProviderAdapter(client).toEthersProvider();
  }
}

/**
 * Convert viem client or return existing ethers provider
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
