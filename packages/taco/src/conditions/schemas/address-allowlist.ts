import { EthAddressSchema } from '@nucypher/shared';
import { ethers } from 'ethers';
import { z } from 'zod';

import { baseConditionSchema, UserAddressSchema } from './common';

export const AddressAllowlistConditionType = 'address-allowlist';

export const addressAllowlistConditionSchema = baseConditionSchema
  .extend({
    conditionType: z.literal(AddressAllowlistConditionType),
    userAddress: UserAddressSchema,
    addresses: z
      .array(EthAddressSchema)
      .min(1, 'At least one address must be provided')
      .max(25, 'Maximum of 25 addresses allowed')
      // Ensure all addresses are valid Ethereum addresses with proper checksum
      .refine((addrs) => {
        try {
          return addrs.every((addr) => {
            // Then verify it has the correct checksum (comparing to canonical form)
            return addr === ethers.utils.getAddress(addr);
          });
        } catch (e) {
          // If any error occurs during validation, fail the validation
          return false;
        }
      }, 'All addresses must be properly checksummed')
      .describe(
        'List of wallet addresses allowed to decrypt. Addresses should be provided in checksummed form. Matching is case-sensitive.',
      ),
  })
  .strict();

export type AddressAllowlistConditionProps = z.infer<
  typeof addressAllowlistConditionSchema
>;

export type AddressAllowlistFields = 'addresses' | 'userAddress';
