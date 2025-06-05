import { EthAddressSchema } from '@nucypher/shared';
import { ethers } from 'ethers';
import { z } from 'zod';

import { baseConditionSchema } from './common';

export const WalletAllowlistConditionType = 'wallet-allowlist';

export const walletAllowlistConditionSchema = baseConditionSchema
  .extend({
    conditionType: z.literal(WalletAllowlistConditionType),
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

export type WalletAllowlistConditionProps = z.infer<
  typeof walletAllowlistConditionSchema
>;

export type WalletAllowlistFields = 'addresses';
