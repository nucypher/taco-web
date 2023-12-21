import { providers } from 'ethers';
import {
  createPublicClient,
  http,
  HttpTransport,
  PublicClient,
  WalletClient,
  webSocket,
} from 'viem';

const transportForTransportType = (type: string) => {
  switch (type) {
    case 'http':
      return http();
    case 'webSocket':
      return webSocket();
    default:
      throw new Error(`Unknown transport type: ${type}`);
  }
};

export const toPublicClient = (client: WalletClient): PublicClient =>
  createPublicClient({
    chain: client.chain,
    transport: transportForTransportType(client.transport.type),
  });

// We need to convert from our PublicClient and WalletClient to ethers.js because we
// rely on typechain to generate our typescript bindings for our contracts, and there
// is no support for viem in typechain, so we use our legacy ethers.js bindings instead.

// Adapted from: https://wagmi.sh/react/ethers-adapters

export const publicClientToProvider = (publicClient: PublicClient) => {
  const { chain, transport } = publicClient;
  if (!chain) {
    throw new Error('chain is undefined');
  }
  const network = {
    chainId: chain.id,
    name: chain.name,
  };
  if (transport.type === 'fallback') {
    return new providers.FallbackProvider(
      (transport.transports as ReturnType<HttpTransport>[]).map(
        ({ value }) => new providers.JsonRpcProvider(value?.url, network),
      ),
    );
  }
  return new providers.JsonRpcProvider(transport.url, network);
};

export const walletClientToSigner = (walletClient: WalletClient) => {
  const { account, chain, transport } = walletClient;
  if (!account) {
    throw new Error('account is undefined');
  }
  if (!chain) {
    throw new Error('chain is undefined');
  }
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts!.ensRegistry!.address,
  };
  const provider = new providers.Web3Provider(transport, network);

  return provider.getSigner(account.address);
};
