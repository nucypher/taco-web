import { ChainId } from './types';

export type Configuration = {
  readonly porterUri: string;
};

const CONFIGS: { readonly [key in ChainId]: Configuration } = {
  [ChainId.POLYGON]: {
    porterUri: 'https://porter.nucypher.community',
  },
  [ChainId.MUMBAI]: {
    porterUri: 'https://porter-tapir.nucypher.community',
  },
  [ChainId.GOERLI]: {
    // TODO: Confirm this is correct
    porterUri: 'https://porter-tapir.nucypher.community',
  },
};

export const defaultConfiguration = (chainId: number): Configuration => {
  if (!Object.values(ChainId).includes(chainId)) {
    throw new Error(`No default configuration found for chainId: ${chainId}`);
  }
  return CONFIGS[chainId as ChainId];
};
