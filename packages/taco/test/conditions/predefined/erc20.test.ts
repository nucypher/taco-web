import { TEST_CHAIN_ID, TEST_CONTRACT_ADDR } from '@nucypher/test-utils';
import { describe, expect, it } from 'vitest';

import { ContractConditionProps } from '../../../src/conditions/base/contract';
import { ERC20Balance } from '../../../src/conditions/predefined/erc20';

describe('ERC20Balance', () => {
  it('should create a valid ERC20Balance instance', () => {
    const props: Pick<
      ContractConditionProps,
      'contractAddress' | 'chain' | 'returnValueTest'
    > = {
      contractAddress: TEST_CONTRACT_ADDR,
      chain: TEST_CHAIN_ID,
      returnValueTest: {
        comparator: '==',
        value: '10',
      },
    };

    const instance = new ERC20Balance(props);
    expect(instance).toBeInstanceOf(ERC20Balance);
    expect(instance.toObj()).toEqual({
      conditionType: 'contract',
      method: 'balanceOf',
      parameters: [':userAddress'],
      standardContractType: 'ERC20',
      ...props,
    });
  });
});
