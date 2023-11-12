import { z } from 'zod';

import {
  CONTEXT_PARAM_REGEXP,
  ETH_ADDRESS_REGEXP,
  USER_ADDRESS_PARAM,
} from '../const';
import { CONTEXT_PARAM_PREFIX } from '../context/context';

export const ContextParamSchema = z.string().regex(CONTEXT_PARAM_REGEXP);
// We want to discriminate between ContextParams and plain strings
// If a string starts with `:`, it's a ContextParam
export const PlainStringSchema = z.string().refine(
  (str) => {
    if (str.startsWith(CONTEXT_PARAM_PREFIX)) {
      return str.match(CONTEXT_PARAM_REGEXP);
    }
    return true;
  },
  {
    message: 'Context parameters must start with ":"',
  },
);

export const ParamPrimitiveTypeSchema = z.union([
  PlainStringSchema,
  z.boolean(),
  z.number(),
]);
export const ParamSchema = z.union([
  ParamPrimitiveTypeSchema,
  z.array(ParamPrimitiveTypeSchema),
]);

export const ParamOrContextParamSchema: z.ZodSchema = z.union([
  ParamSchema,
  ContextParamSchema,
  z.lazy(() => z.array(ParamOrContextParamSchema)),
]);

export const returnValueTestSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  comparator: z.enum(['==', '>', '<', '>=', '<=', '!=']),
  value: ParamOrContextParamSchema,
});

export type ReturnValueTestProps = z.infer<typeof returnValueTestSchema>;

const EthAddressSchema = z.string().regex(ETH_ADDRESS_REGEXP);
const UserAddressSchema = z.literal(USER_ADDRESS_PARAM);
export const EthAddressOrUserAddressSchema = z.union([
  EthAddressSchema,
  UserAddressSchema,
]);
