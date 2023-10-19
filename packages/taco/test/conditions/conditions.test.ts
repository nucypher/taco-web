import { fakeProvider, fakeSigner } from "@nucypher/test-utils";
import {beforeAll, describe, expect, it} from "vitest";

import { initialize } from "../../src";
import { CompoundCondition, ConditionContext } from "../../src/conditions";

describe('compound condition', () => {
  beforeAll(async () => {
    await initialize();
  });

  it('can be created', () => {
    const hasPositiveBalance = {
      chain: 80001,
      method: 'eth_getBalance',
      parameters: [':userAddress', 'latest'],
      returnValueTest: {
        index: 0,
        comparator: '>',
        value: 0,
      },
    };
    const timeIsGreaterThan = {
      chain: 5,
      method: 'blocktime',
      returnValueTest: {
        index: 0,
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
      [condition],
      {':time': 100},
      fakeSigner()
    );
    expect(context).toBeDefined();

    const asObj = condition.toObj();
    expect(asObj).toBeDefined();
  });
});
