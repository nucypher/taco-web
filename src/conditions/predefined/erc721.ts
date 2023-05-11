import { EvmCondition } from '../base';
import { USER_ADDRESS_PARAM } from '../const';

export class ERC721Ownership extends EvmCondition {
  readonly defaults = {
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

export class ERC721Balance extends EvmCondition {
  readonly defaults = {
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
