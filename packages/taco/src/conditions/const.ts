import { ChainId } from '@nucypher/shared';
import { USER_ADDRESS_PARAM_DEFAULT } from '@nucypher/taco-auth';

// Only allow alphanumeric characters and underscores
export const CONTEXT_PARAM_REGEXP = new RegExp('^:[a-zA-Z_][a-zA-Z0-9_]*$');

export const CONTEXT_PARAM_PREFIX = ':';

export const SUPPORTED_CHAIN_IDS = [
  ChainId.POLYGON,
  ChainId.AMOY,
  ChainId.SEPOLIA,
  ChainId.ETHEREUM_MAINNET,
];

export const USER_ADDRESS_PARAMS = [
  // Ordering matters, this should always be last
  USER_ADDRESS_PARAM_DEFAULT,
];
