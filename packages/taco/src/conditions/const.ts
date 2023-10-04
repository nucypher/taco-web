import { ChainId } from '@nucypher/shared';

export const USER_ADDRESS_PARAM = ':userAddress';

export const ETH_ADDRESS_REGEXP = new RegExp('^0x[a-fA-F0-9]{40}$');

export const SUPPORTED_CHAIN_IDS = [
  ChainId.POLYGON,
  ChainId.MUMBAI,
  ChainId.GOERLI,
  ChainId.MAINNET,
];
