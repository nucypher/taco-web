import { Condition } from '../condition';
import {
  ContractConditionProps,
  contractConditionSchema,
  ContractConditionType,
} from '../schemas/contract';
import { OmitConditionType } from '../shared';

export {
  ContractConditionProps,
  contractConditionSchema,
  ContractConditionType,
  FunctionAbiProps,
} from '../schemas/contract';

export class ContractCondition extends Condition {
  constructor(value: OmitConditionType<ContractConditionProps>) {
    super(contractConditionSchema, {
      conditionType: ContractConditionType,
      ...value,
    });
  }
}
