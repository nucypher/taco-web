import { EthAddressSchema } from '@nucypher/shared';
import {
  USER_ADDRESS_PARAM_DEFAULT,
  USER_ADDRESS_PARAM_EXTERNAL_EIP4361,
} from '@nucypher/taco-auth';
import { z } from 'zod';

import { CONTEXT_PARAM_PREFIX, CONTEXT_PARAM_REGEXP } from './const';

export const contextParamSchema = z.string().regex(CONTEXT_PARAM_REGEXP);
// We want to discriminate between ContextParams and plain strings
// If a string starts with `:`, it's a ContextParam
export const plainStringSchema = z.string().refine(
  (str) => {
    return !str.startsWith(CONTEXT_PARAM_PREFIX);
  },
  {
    message: `String must not be a context parameter i.e. not start with "${CONTEXT_PARAM_PREFIX}"`,
  },
);

const paramSchema = z.union([plainStringSchema, z.boolean(), z.number()]);

export const paramOrContextParamSchema: z.ZodSchema = z.union([
  paramSchema,
  contextParamSchema,
  z.lazy(() => z.array(paramOrContextParamSchema)),
]);

export const returnValueTestSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  comparator: z.enum(['==', '>', '<', '>=', '<=', '!=']),
  value: paramOrContextParamSchema,
});

export type ReturnValueTestProps = z.infer<typeof returnValueTestSchema>;

const UserAddressSchema = z.enum([
  USER_ADDRESS_PARAM_DEFAULT,
  USER_ADDRESS_PARAM_EXTERNAL_EIP4361,
]);
export const EthAddressOrUserAddressSchema = z.union([
  EthAddressSchema,
  UserAddressSchema,
]);

export type OmitConditionType<T> = Omit<T, 'conditionType'>;
