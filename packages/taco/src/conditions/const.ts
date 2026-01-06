import { USER_ADDRESS_PARAM_DEFAULT } from '@nucypher/taco-auth';

// Only allow alphanumeric characters and underscores
const contextParamRegexString = ':[a-zA-Z_][a-zA-Z0-9_]*';

export const CONTEXT_PARAM_REGEXP = new RegExp(contextParamRegexString);

// Entire string is context param
export const CONTEXT_PARAM_FULL_MATCH_REGEXP = new RegExp(
  `^${contextParamRegexString}$`,
);

export const CONTEXT_PARAM_PREFIX = ':';

export const USER_ADDRESS_PARAMS = [
  // Ordering matters, this should always be last
  USER_ADDRESS_PARAM_DEFAULT,
];

/**
 * Checks if a value is a context parameter (entire string matches pattern).
 */
export const isContextParameter = (param: unknown): boolean => {
  return !!String(param).match(CONTEXT_PARAM_FULL_MATCH_REGEXP);
};

/**
 * Recursively finds all context parameters (`:paramName`) in a value.
 * Handles strings, arrays, and objects.
 */
export const findAllContextParams = (value: unknown): Set<string> => {
  const contextParams = new Set<string>();

  if (!value) {
    return contextParams;
  }

  if (typeof value === 'string') {
    if (isContextParameter(value)) {
      // entire string is context parameter
      contextParams.add(String(value));
    } else {
      // context var could be substring; find all matches
      const matches = value.match(
        // RegExp with 'g' is stateful, so new instance needed every time
        new RegExp(CONTEXT_PARAM_REGEXP.source, 'g'),
      );
      if (matches) {
        for (const match of matches) {
          contextParams.add(match);
        }
      }
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => {
      findAllContextParams(item).forEach((param) => contextParams.add(param));
    });
  } else if (typeof value === 'object') {
    for (const [, entry] of Object.entries(value)) {
      findAllContextParams(entry).forEach((param) => contextParams.add(param));
    }
  }

  return contextParams;
};
