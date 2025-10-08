import { USER_ADDRESS_PARAM_DEFAULT } from '@nucypher/taco-auth';

import {
  ContractCondition,
  ContractConditionProps,
  ContractConditionType,
} from '../base/contract.js';

type ERC721OwnershipFields = 'contractAddress' | 'chain' | 'parameters';

const ERC721OwnershipDefaults: Omit<
  ContractConditionProps,
  ERC721OwnershipFields
> = {
  conditionType: ContractConditionType,
  method: 'ownerOf',
  standardContractType: 'ERC721',
  returnValueTest: {
    comparator: '==',
    value: USER_ADDRESS_PARAM_DEFAULT,
  },
};

export class ERC721Ownership extends ContractCondition {
  constructor(value: Pick<ContractConditionProps, ERC721OwnershipFields>) {
    super({ ...ERC721OwnershipDefaults, ...value });
  }
}

type ERC721BalanceFields = 'contractAddress' | 'chain' | 'returnValueTest';

const ERC721BalanceDefaults: Omit<ContractConditionProps, ERC721BalanceFields> =
  {
    conditionType: ContractConditionType,
    method: 'balanceOf',
    parameters: [USER_ADDRESS_PARAM_DEFAULT],
    standardContractType: 'ERC721',
  };

export class ERC721Balance extends ContractCondition {
  constructor(value: Pick<ContractConditionProps, ERC721BalanceFields>) {
    super({ ...ERC721BalanceDefaults, ...value });
  }
}
