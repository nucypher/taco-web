import { WalletAllowlistCondition } from '../base/wallet-allowlist';
import {
  WalletAllowlistConditionProps,
  WalletAllowlistFields,
} from '../schemas/wallet-allowlist';

// Default values (currently none)
export const WalletAllowlistDefaults = {};

/**
 * A condition that grants decryption permissions to specific wallet addresses.
 * The condition is satisfied when the requester can prove they control one of
 * the specified addresses.
 *
 * The requester must prove control of one of the specified addresses (handled by
 * upstream authentication providers such as EIP-4361 or EIP-1271).
 *
 * This is a gas-free condition as it doesn't require any on-chain transactions.
 */
export class WalletOwnership extends WalletAllowlistCondition {
  constructor(
    value: Pick<
      WalletAllowlistConditionProps,
      WalletAllowlistFields
    >,
  ) {
    super({ ...WalletAllowlistDefaults, ...value });
  }
}
