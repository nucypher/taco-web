import { Condition } from '../condition';
import {
  AddressAllowlistConditionProps,
  addressAllowlistConditionSchema,
  AddressAllowlistConditionType,
} from '../schemas/address-allowlist';
import { OmitConditionType } from '../shared';
export { AddressAllowlistConditionProps, AddressAllowlistConditionType };

/**
 * A condition that checks if a wallet address is in a list of allowed addresses.
 */
export class AddressAllowlistCondition extends Condition {
  constructor(value: OmitConditionType<AddressAllowlistConditionProps>) {
    super(addressAllowlistConditionSchema, {
      conditionType: AddressAllowlistConditionType,
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
