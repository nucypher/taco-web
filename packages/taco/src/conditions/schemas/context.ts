import { z } from 'zod';

import { CONTEXT_PARAM_FULL_MATCH_REGEXP } from '../const';

import { plainStringSchema } from './common';

export const contextParamSchema = z
  .string()
  .regex(CONTEXT_PARAM_FULL_MATCH_REGEXP)
  .describe(
    `A Context Parameter i.e. a string that starts with \`:\` and then a letter or a \`_\` followed by a string containing letters, \`_\` or numbers.`,
  );

const paramSchema = z.union([plainStringSchema, z.boolean(), z.number()]);

export const paramOrContextParamSchema: z.ZodSchema = z.union([
  paramSchema,
  contextParamSchema,
  z.lazy(() => z.array(paramOrContextParamSchema)),
]);
