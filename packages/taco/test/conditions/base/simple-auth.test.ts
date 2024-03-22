import { TEST_CHAIN_ID } from '@nucypher/test-utils';
import { describe, expect, it } from 'vitest';

import { RpcConditionProps } from '../../../src/conditions/base/rpc';
import {
  TimeConditionMethod,
  TimeConditionProps,
} from '../../../src/conditions/base/time';
import {
  CompoundCondition,
  CompoundConditionProps,
} from '../../../src/conditions/compound-condition';

describe('simple auth', () => {
  it('works', () => {
    // We don't actually care about the user's balance, we just need their signature
    const hasBalance: RpcConditionProps = {
      conditionType: 'rpc',
      chain: TEST_CHAIN_ID,
      method: 'eth_getBalance',
      parameters: [':userAddress', 'latest'],
      returnValueTest: {
        comparator: '!=',
        value: 0,
      },
    };

    const hasNoBalance: CompoundConditionProps = {
      conditionType: 'compound',
      operator: 'not',
      operands: [hasBalance],
    };

    // I don't care if the user has a balance or not, I just need to authenticate them
    const authNoop: CompoundConditionProps = {
      conditionType: 'compound',
      operator: 'or',
      operands: [hasBalance, hasNoBalance],
    };

    // Put a time constraint on the authentication validity
    const goodUntil: TimeConditionProps = {
      conditionType: 'time',
      method: TimeConditionMethod,
      chain: TEST_CHAIN_ID,
      returnValueTest: {
        comparator: '>',
        value: 1000,
      },
    };

    // This is our final authentication condition
    const authGoodUntil = new CompoundCondition({
      operator: 'and',
      operands: [goodUntil, authNoop],
    });

    expect(authGoodUntil).toBeDefined();
  });
});
