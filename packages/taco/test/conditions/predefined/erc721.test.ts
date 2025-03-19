import { USER_ADDRESS_PARAM_DEFAULT } from '@nucypher/taco-auth';
import { TEST_CHAIN_ID, TEST_CONTRACT_ADDR } from '@nucypher/test-utils';
import { describe, expect, it } from 'vitest';

import { ContractConditionProps } from '../../../src/conditions/base/contract';
import {
  ERC721Balance,
  ERC721Ownership,
} from '../../../src/conditions/predefined/erc721';

describe('ERC721Ownership', () => {
  it('should create a valid ERC721Ownership instance', () => {
    const props: Pick<
      ContractConditionProps,
      'contractAddress' | 'chain' | 'parameters'
    > = {
      contractAddress: TEST_CONTRACT_ADDR,
      chain: TEST_CHAIN_ID,
      parameters: [USER_ADDRESS_PARAM_DEFAULT, BigInt(10)],
    };

    const instance = new ERC721Ownership(props);
    expect(instance).toBeInstanceOf(ERC721Ownership);
    expect(instance.toObj()).toEqual({
      conditionType: 'contract',
      method: 'ownerOf',
      returnValueTest: {
        comparator: '==',
        value: ':userAddress',
      },
      standardContractType: 'ERC721',
      ...props,
    });
  });
});

describe('ERC721Balance', () => {
  it('should create a valid ERC721Balance instance', () => {
    const props: Pick<
      ContractConditionProps,
      'contractAddress' | 'chain' | 'returnValueTest'
    > = {
      contractAddress: TEST_CONTRACT_ADDR,
      chain: TEST_CHAIN_ID,
      returnValueTest: {
        comparator: '==',
        value: BigInt(10),
      },
    };

    const instance = new ERC721Balance(props);
    expect(instance).toBeInstanceOf(ERC721Balance);
    expect(instance.toObj()).toEqual({
      conditionType: 'contract',
      method: 'balanceOf',
      parameters: [':userAddress'],
      standardContractType: 'ERC721',
      ...props,
    });
  });
});
