import { z } from 'zod';

import { baseConditionSchema } from './common.js';
import { contextParamSchema } from './context.js';

export const JWT_PARAM_DEFAULT = ':jwtToken';

export const JWTConditionType = 'jwt';

export const jwtConditionSchema = baseConditionSchema.extend({
  conditionType: z.literal(JWTConditionType).default(JWTConditionType),
  publicKey: z.string(),
  expectedIssuer: z.string().optional(),
  // TODO see https://github.com/nucypher/taco-web/pull/604#discussion_r1901746814
  // subject: contextParamSchema.optional(),
  // expirationWindow: z.number().int().nonnegative().optional(),
  // issuedWindow: z.number().int().nonnegative().optional(),
  jwtToken: contextParamSchema.default(JWT_PARAM_DEFAULT),
});

export type JWTConditionProps = z.infer<typeof jwtConditionSchema>;
