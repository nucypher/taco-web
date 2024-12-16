import { z } from 'zod';

import { baseConditionSchema } from './common';
import { contextParamSchema } from './context';

export const JWT_PARAM_DEFAULT = ':jwtToken';

export const JWTConditionType = 'jwt';

export const jwtConditionSchema = baseConditionSchema.extend({
  conditionType: z.literal(JWTConditionType).default(JWTConditionType),
  publicKey: z.string().optional(),
  expectedIssuer: z.string().optional(),
  subject: contextParamSchema.optional(),
  expirationWindow: z.number().int().nonnegative().optional(),
  issuedWindow: z.number().int().nonnegative().optional(),
  jwtToken: contextParamSchema.default(JWT_PARAM_DEFAULT),
});

export type JWTConditionProps = z.infer<typeof jwtConditionSchema>;
