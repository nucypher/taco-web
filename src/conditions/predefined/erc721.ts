import { ContractCondition } from '../base';
import { USER_ADDRESS_PARAM } from '../const';

export class ERC721Ownership extends ContractCondition {
  public readonly defaults = {
    method: 'ownerOf',
    parameters: [],
    standardContractType: 'ERC721',
    returnValueTest: {
      index: 0,
      comparator: '==',
      value: USER_ADDRESS_PARAM,
    },
  };
}

export class ERC721Balance extends ContractCondition {
  public readonly defaults = {
    method: 'balanceOf',
    parameters: [USER_ADDRESS_PARAM],
    standardContractType: 'ERC721',
    returnValueTest: {
      index: 0,
      comparator: '>',
      value: '0',
    },
  };
}
