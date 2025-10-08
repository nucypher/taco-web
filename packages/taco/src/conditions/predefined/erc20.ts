import { USER_ADDRESS_PARAM_DEFAULT } from '@nucypher/taco-auth';

import {
  ContractCondition,
  ContractConditionProps,
  ContractConditionType,
} from '../base/contract.js';

type ERC20BalanceFields = 'contractAddress' | 'chain' | 'returnValueTest';

const ERC20BalanceDefaults: Omit<ContractConditionProps, ERC20BalanceFields> = {
  conditionType: ContractConditionType,
  method: 'balanceOf',
  parameters: [USER_ADDRESS_PARAM_DEFAULT],
  standardContractType: 'ERC20',
};

export class ERC20Balance extends ContractCondition {
  constructor(value: Pick<ContractConditionProps, ERC20BalanceFields>) {
    super({ ...ERC20BalanceDefaults, ...value });
  }
}
