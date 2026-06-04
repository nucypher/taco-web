import { USER_ADDRESS_PARAM_DEFAULT } from '@nucypher/taco-auth';

import {
  ContextVariableCondition,
  ContextVariableConditionProps,
  ContextVariableConditionType,
} from '../base/context-variable';
import { ERR_INVALID_CONDITION } from '../condition';
import {
  AddressAllowlistConditionProps,
  addressAllowlistConditionSchema,
} from '../schemas/address-allowlist';

export { AddressAllowlistConditionProps } from '../schemas/address-allowlist';

/**
 * A Client-side condition that checks if a user's address is in an allowlist and transforms the object into `ContextVariableCondition`.
 * The nodes process this as a standard context variable that checks if the user's address is in the allowlist.
 * @remark This condition doesn’t have a unique type of its own; it is simply a wrapper for creating a `ContextVariableCondition`.
 */
export class AddressAllowlistCondition extends ContextVariableCondition {
  constructor(value: AddressAllowlistConditionProps) {
    const { data, error } = AddressAllowlistCondition.validate(
      addressAllowlistConditionSchema,
      value,
    );
    if (error) {
      throw new Error(ERR_INVALID_CONDITION(error));
    }

    const contextVariableConditionProps: ContextVariableConditionProps = {
      conditionType: ContextVariableConditionType,
      contextVariable: USER_ADDRESS_PARAM_DEFAULT,
      returnValueTest: {
        comparator: 'in',
        value: data,
      },
    };

    super(contextVariableConditionProps);
  }
}
