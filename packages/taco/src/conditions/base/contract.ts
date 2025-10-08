import { Condition } from '../condition.js';
import {
  ContractConditionProps,
  contractConditionSchema,
  ContractConditionType,
} from '../schemas/contract.js';
import { OmitConditionType } from '../shared.js';

export {
  ContractConditionProps,
  contractConditionSchema,
  ContractConditionType,
  FunctionAbiProps,
} from '../schemas/contract.js';

export class ContractCondition extends Condition {
  constructor(value: OmitConditionType<ContractConditionProps>) {
    super(contractConditionSchema, {
      conditionType: ContractConditionType,
      ...value,
    });
  }
}
