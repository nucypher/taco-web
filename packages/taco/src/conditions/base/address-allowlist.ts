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
 * 
 * @deprecated Use ContextVariableCondition instead, which provides more flexible
 * context variable matching capabilities and can replicate this functionality
 * with contextVariable: ':userAddress' and expectedValues as the addresses array.
 */
export class AddressAllowlistCondition extends Condition {
  constructor(value: OmitConditionType<AddressAllowlistConditionProps>) {
    super(addressAllowlistConditionSchema, {
      conditionType: AddressAllowlistConditionType,
      ...value,
    });
  }
}
