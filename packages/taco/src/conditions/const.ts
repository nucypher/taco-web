import {
  USER_ADDRESS_PARAM_DEFAULT,
  USER_ADDRESS_PARAM_EIP1271,
  USER_ADDRESS_PARAM_EXTERNAL_EIP4361,
} from '@nucypher/taco-auth';

// Only allow alphanumeric characters and underscores
const contextParamRegexString = ':[a-zA-Z_][a-zA-Z0-9_]*';

export const CONTEXT_PARAM_REGEXP = new RegExp(contextParamRegexString);

// Entire string is context param
export const CONTEXT_PARAM_FULL_MATCH_REGEXP = new RegExp(
  `^${contextParamRegexString}$`,
);

export const CONTEXT_PARAM_PREFIX = ':';

export const USER_ADDRESS_PARAMS = [
  USER_ADDRESS_PARAM_EXTERNAL_EIP4361,
  USER_ADDRESS_PARAM_EIP1271,
  // Ordering matters, this should always be last
  USER_ADDRESS_PARAM_DEFAULT,
];
