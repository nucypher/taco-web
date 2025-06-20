import { EthAddressSchemaStrict } from '@nucypher/shared';
import { z } from 'zod';

import { baseConditionSchema, UserAddressSchema } from './common';

export const AddressAllowlistConditionType = 'address-allowlist';

export const addressAllowlistConditionSchema = baseConditionSchema
  .extend({
    conditionType: z.literal(AddressAllowlistConditionType),
    userAddress: UserAddressSchema,
    addresses: z
      .array(EthAddressSchemaStrict)
      .min(1, 'At least one address must be provided')
      .max(25, 'Maximum of 25 addresses allowed')
      .describe(
        'List of wallet addresses allowed to decrypt. Addresses should be provided in checksummed form. Matching is case-sensitive.',
      ),
  })
  .strict();

export type AddressAllowlistConditionProps = z.infer<
  typeof addressAllowlistConditionSchema
>;
