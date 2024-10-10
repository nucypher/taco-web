import { z } from 'zod';

import { paramOrContextParamSchema } from './context';

export const returnValueTestSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  comparator: z.enum(['==', '>', '<', '>=', '<=', '!=']),
  value: paramOrContextParamSchema,
});

export type ReturnValueTestProps = z.infer<typeof returnValueTestSchema>;
