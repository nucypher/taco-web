import { z } from 'zod';

import { baseConditionSchema } from './common';
import { contextParamSchema } from './context';

export const JWT_PARAM_DEFAULT = ':jwtToken';

export const JWTConditionType = 'jwt';

export const jwtConditionSchema = baseConditionSchema.extend({
  conditionType: z.literal(JWTConditionType).default(JWTConditionType),
  public_key: z.string().optional(),
  expected_issuer: z.string().optional(),
  subject: contextParamSchema.optional(),
  expiration_window: z.number().int().nonnegative().optional(),
  issued_window: z.number().int().nonnegative().optional(),
  jwtToken: contextParamSchema.default(JWT_PARAM_DEFAULT),
});

export type JWTConditionProps = z.infer<typeof jwtConditionSchema>;
