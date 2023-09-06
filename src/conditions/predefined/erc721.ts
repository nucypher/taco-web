import { ContractCondition, ContractConditionProps } from '../base';
import { USER_ADDRESS_PARAM } from '../const';

// TODO: Rewrite these using Zod schemas?

type ERC721OwnershipFields = 'contractAddress' | 'chain' | 'parameters';

const ERC721OwnershipDefaults: Omit<
  ContractConditionProps,
  ERC721OwnershipFields
> = {
  conditionType: 'contract',
  method: 'ownerOf',
  standardContractType: 'ERC721',
  returnValueTest: {
    index: 0,
    comparator: '==',
    value: USER_ADDRESS_PARAM,
  },
};

export class ERC721Ownership extends ContractCondition {
  constructor(value: Pick<ContractConditionProps, ERC721OwnershipFields>) {
    super({ ...ERC721OwnershipDefaults, ...value });
  }
}

type ERC721BalanceFields = 'contractAddress' | 'chain';

const ERC721BalanceDefaults: Omit<ContractConditionProps, ERC721BalanceFields> =
  {
    conditionType: 'contract',
    method: 'balanceOf',
    parameters: [USER_ADDRESS_PARAM],
    standardContractType: 'ERC721',
    returnValueTest: {
      index: 0,
      comparator: '>',
      value: '0',
    },
  };

export class ERC721Balance extends ContractCondition {
  constructor(value: Pick<ContractConditionProps, ERC721BalanceFields>) {
    super({ ...ERC721BalanceDefaults, ...value });
  }
}