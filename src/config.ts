import { ChainId } from './types';

const PORTER_URIS: { readonly [key in ChainId]: string } = {
  // TODO: Make sure these are correct
  [ChainId.POLYGON]: 'https://porter.nucypher.community',
  [ChainId.MUMBAI]: 'https://porter-tapir.nucypher.community',
  [ChainId.GOERLI]: 'https://porter-tapir.nucypher.community',
  [ChainId.MAINNET]: 'https://porter.nucypher.io/',
};

export const defaultPorterUri = (chainId: number): string => {
  if (!Object.values(ChainId).includes(chainId)) {
    throw new Error(`No default Porter URI found for chainId: ${chainId}`);
  }
  return PORTER_URIS[chainId as ChainId];
};
