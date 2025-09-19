import {
  ContextVariableCondition,
  ContextVariableConditionProps,
  ContextVariableConditionType,
} from '../base/context-variable';
import { Condition, ERR_INVALID_CONDITION } from '../condition';
import {
  AddressAllowlistConditionProps,
  addressAllowlistConditionSchema,
  AddressAllowlistConditionType,
} from '../schemas/address-allowlist';
import { OmitConditionType } from '../shared';

export {
  AddressAllowlistConditionProps,
  AddressAllowlistConditionType,
} from '../schemas/address-allowlist';

/**
 * A predefined condition that checks if a user's address is in an allowlist.
 * This condition uses a ContextVariableCondition internally to check if the
 * specified context variable (e.g., ':userAddress') is in the provided list
 * of allowed addresses.
 */
export class AddressAllowlistCondition extends ContextVariableCondition {
  constructor(value: OmitConditionType<AddressAllowlistConditionProps>) {
    const { data, error } = Condition.validate(
      addressAllowlistConditionSchema,
      {
        conditionType: AddressAllowlistConditionType,
        ...value,
      },
    );
    if (error) {
      throw new Error(ERR_INVALID_CONDITION(error));
    }

    const contextVariableCondition: ContextVariableConditionProps = {
      conditionType: ContextVariableConditionType,
      contextVariable: data.userAddress,
      returnValueTest: {
        comparator: 'in',
        value: data.addresses,
      },
    };

    super(contextVariableCondition);
  }
}
