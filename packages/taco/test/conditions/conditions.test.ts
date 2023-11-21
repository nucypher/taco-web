import { ChainId } from '@nucypher/shared';
import { fakeProvider, fakeSigner } from '@nucypher/test-utils';
import { beforeAll, describe, expect, it } from 'vitest';

import { initialize } from '../../src';
import { CompoundCondition, ConditionContext } from '../../src/conditions';
import { SUPPORTED_CHAIN_IDS } from '../../src/conditions/const';

describe('conditions', () => {
  beforeAll(async () => {
    await initialize();
  });

  it('creates a complex condition with custom parameters', async () => {
    const hasPositiveBalance = {
      chain: 80001,
      method: 'eth_getBalance',
      parameters: [':userAddress', 'latest'],
      returnValueTest: {
        comparator: '>',
        value: 0,
      },
    };
    const timeIsGreaterThan = {
      chain: 5,
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
    expect(condition.requiresSigner()).toBeTruthy();

    const context = new ConditionContext(
      fakeProvider(),
      condition,
      { ':time': 100 },
      fakeSigner(),
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
