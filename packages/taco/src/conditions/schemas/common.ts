import { JSONPath } from '@astronautlabs/jsonpath';
import { USER_ADDRESS_PARAM_DEFAULT } from '@nucypher/taco-auth';
import { Primitive, z, ZodLiteral } from 'zod';

import { CONTEXT_PARAM_PREFIX, CONTEXT_PARAM_REGEXP } from '../const';

// We want to discriminate between ContextParams and plain strings
// If a string starts with `:`, it's a ContextParam
export const plainStringSchema = z
  .string()
  .refine(
    (str) => {
      return !str.startsWith(CONTEXT_PARAM_PREFIX);
    },
    {
      message: `String must not be a context parameter i.e. not start with "${CONTEXT_PARAM_PREFIX}"`,
    },
  )
  .describe(
    `Any string that is not a Context Parameter i.e. does not start with \`${CONTEXT_PARAM_PREFIX}\`.`,
  );

export const UserAddressSchema = z
  .literal(USER_ADDRESS_PARAM_DEFAULT)
  .describe(
    'This is a context variable that will be replaced at decryption time. It represents the Ethereum address of the requester attempting decryption.',
  );

export const baseConditionSchema = z.object({
  conditionType: z
    .string()
    .describe(
      'A unique identifier that indicates the condition variant in its serialized form. It is set automatically at every sub-class constructor when a new object is being created.',
    ),
});

// Source: https://github.com/colinhacks/zod/issues/831#issuecomment-1063481764
const createUnion = <
  T extends Readonly<[Primitive, Primitive, ...Primitive[]]>,
>(
  values: T,
) => {
  const zodLiterals = values.map((value) => z.literal(value)) as unknown as [
    ZodLiteral<Primitive>,
    ZodLiteral<Primitive>,
    ...ZodLiteral<Primitive>[],
  ];
  return z.union(zodLiterals);
};

function createUnionSchema<T extends readonly Primitive[]>(values: T) {
  if (values.length === 0) {
    return z.never();
  }

  if (values.length === 1) {
    return z.literal(values[0]);
  }

  return createUnion(
    values as unknown as Readonly<[Primitive, Primitive, ...Primitive[]]>,
  );
}

export default createUnionSchema;

const validateJSONPath = (jsonPath: string): boolean => {
  // account for embedded context variables
  if (CONTEXT_PARAM_REGEXP.test(jsonPath)) {
    // skip validation
    return true;
  }

  try {
    JSONPath.parse(jsonPath);
    return true;
  } catch (error) {
    return false;
  }
};

export const jsonPathSchema = z
  .string()
  .refine((val) => validateJSONPath(val), {
    message: 'Invalid JSONPath expression',
  })
  .describe(
    'A string containing either a valid JSON Path Expression, or a Context Parameter.',
  );

const validateHttpsURL = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    // Check if the URL is valid and uses HTTPS
    return parsedUrl.protocol === 'https:';
  } catch (e) {
    // If URL constructor throws, the URL is invalid
    return false;
  }
};

export const jsonAuthorizationTypeSchema = z
  .enum(['Bearer', 'Basic', 'X-API-Key'])
  .describe('The type of authorization to use when making the request.');

// Use our own URL refinement check due to https://github.com/colinhacks/zod/issues/2236
export const httpsURLSchema = z
  .string()
  .url()
  .refine((url) => validateHttpsURL(url), {
    message: 'Invalid URL',
  });

export const hexStringSchema = z
  .string()
  .regex(/^[0-9a-fA-F]+$/, 'Invalid hex string')
  .describe('A string containing only hexadecimal characters (0-9, a-f, A-F)');
