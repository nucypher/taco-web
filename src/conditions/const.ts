import { ChainId } from '../types';

export const SUPPORTED_CHAINS = [
  ChainId.MAINNET,
  ChainId.GOERLI,
  ChainId.POLYGON,
  ChainId.MUMBAI,
];

export const USER_ADDRESS_PARAM = ':userAddress';

export const ETH_ADDRESS_REGEXP = new RegExp('^0x[a-fA-F0-9]{40}$');
