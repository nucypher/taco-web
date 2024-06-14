import { ChainId } from '@nucypher/shared';
import { fakeAuthProviders } from '@nucypher/test-utils';
import { beforeAll, describe, expect, it } from 'vitest';

import { initialize } from '../../src';
import { CompoundCondition } from '../../src/conditions/compound-condition';
import { SUPPORTED_CHAIN_IDS } from '../../src/conditions/const';
import { ConditionContext } from '../../src/conditions/context';

describe('conditions', () => {
  beforeAll(async () => {
    await initialize();
  });

  it('creates a complex condition with custom parameters', async () => {
    const hasPositiveBalance = {
      chain: ChainId.AMOY,
      method: 'eth_getBalance',
      parameters: [':userAddress', 'latest'],
      returnValueTest: {
        comparator: '>',
        value: 0,
      },
    };
    const timeIsGreaterThan = {
      chain: ChainId.SEPOLIA,
      method: 'blocktime',
      returnValueTest: {
        comparator: '>',
        value: ':time',
      },
    };
    const condition = new CompoundCondition({
      operator: 'and',
      operands: [hasPositiveBalance, timeIsGreaterThan],
    });
    expect(condition).toBeDefined();
    expect(condition.requiresAuthentication()).toBeTruthy();

    const context = new ConditionContext(
      condition,
      { ':time': 100 },
      fakeAuthProviders(),
    );
    expect(context).toBeDefined();

    const asObj = await context.toObj();
    expect(asObj).toBeDefined();
    expect(asObj[':time']).toBe(100);
  });

  it('has supported chains consistent with shared', async () => {
    const chainIdsAndNames = Object.values(ChainId);
    const chainIds = chainIdsAndNames.filter((id) => typeof id === 'number');
    expect(SUPPORTED_CHAIN_IDS).toEqual(chainIds);
  });
});
