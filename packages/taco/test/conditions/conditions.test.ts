import { ChainId } from '@nucypher/shared';
import { AuthProvider, USER_ADDRESS_PARAM_DEFAULT } from '@nucypher/taco-auth';
import { fakeAuthProviders } from '@nucypher/test-utils';
import { beforeAll, describe, expect, it } from 'vitest';

import { initialize } from '../../src';
import { CompoundCondition } from '../../src/conditions/compound-condition';
import { SUPPORTED_CHAIN_IDS } from '../../src/conditions/const';
import { ConditionContext } from '../../src/conditions/context';

describe('conditions', () => {
  let authProviders: Record<string, AuthProvider>;
  beforeAll(async () => {
    await initialize();
    authProviders = await fakeAuthProviders();
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

    const context = new ConditionContext(condition);
    context.addCustomContextParameterValues({ ':time': 100 });
    context.addAuthProvider(
      USER_ADDRESS_PARAM_DEFAULT,
      authProviders[USER_ADDRESS_PARAM_DEFAULT],
    );

    expect(context).toBeDefined();

    const asObj = await context.toContextParameters();
    expect(asObj).toBeDefined();
    expect(asObj[':time']).toBe(100);
  });

  it('has supported chains consistent with shared', async () => {
    const chainIdsAndNames = Object.values(ChainId);
    const chainIds = chainIdsAndNames.filter((id) => typeof id === 'number');
    expect(SUPPORTED_CHAIN_IDS).toEqual(chainIds);
  });
});
