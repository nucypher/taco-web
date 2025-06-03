import { Condition } from '../condition';
import {
  WalletAllowlistConditionProps,
  walletAllowlistConditionSchema,
  WalletAllowlistConditionType,
} from '../schemas/wallet-allowlist';
import { OmitConditionType } from '../shared';
export { WalletAllowlistConditionProps, WalletAllowlistConditionType };

/**
 * A condition that checks if a wallet address is in a list of allowed addresses.
 */
export class WalletAllowlistCondition extends Condition {
  constructor(value: OmitConditionType<WalletAllowlistConditionProps>) {
    super(walletAllowlistConditionSchema, {
      conditionType: WalletAllowlistConditionType,
      ...value,
    });
  }

  /**
   * This condition requires wallet authentication to verify addresses
   */
  override requiresAuthentication(): boolean {
    return true;
  }
}
