import { EthAddressSchemaStrict } from '@nucypher/shared';
import { z } from 'zod';

export const addressAllowlistConditionSchema = z
  .array(EthAddressSchemaStrict)
  .min(1, 'At least one address must be provided')
  .max(25, 'A maximum of 25 addresses is allowed')
  .describe(
    'List of allowed wallet addresses. Addresses should be provided in checksummed form.',
  );

export type AddressAllowlistConditionProps = z.infer<
  typeof addressAllowlistConditionSchema
>;
