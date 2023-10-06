import { TEST_CONTRACT_ADDR } from '@nucypher/test-utils';
import { describe, expect, it } from 'vitest';

import { RpcCondition } from '../../../src/conditions';
import { rpcConditionSchema } from '../../../src/conditions/base/rpc';
import { testRpcConditionObj } from '../../test-utils';

describe('validation', () => {
  it('accepts on a valid schema', () => {
    const result = RpcCondition.validate(
      rpcConditionSchema,
      testRpcConditionObj,
    );

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(testRpcConditionObj);
  });

  it('rejects an invalid schema', () => {
    const badRpcObj = {
      ...testRpcConditionObj,
      // Intentionally replacing `method` with an invalid method
      method: 'fake_invalid_method',
    } as unknown as typeof testRpcConditionObj;

    const result = RpcCondition.validate(rpcConditionSchema, badRpcObj);

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
    expect(result.error?.format()).toMatchObject({
      method: {
        _errors: [
          "Invalid enum value. Expected 'eth_getBalance' | 'balanceOf', received 'fake_invalid_method'",
        ],
      },
    });
  });

  describe('parameters', () => {
    it('accepts a single address', () => {
      const result = RpcCondition.validate(rpcConditionSchema, {
        ...testRpcConditionObj,
        parameters: [TEST_CONTRACT_ADDR],
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({
        ...testRpcConditionObj,
        parameters: [TEST_CONTRACT_ADDR],
      });
    });

    it('accepts a single address and a block number', () => {
      const result = RpcCondition.validate(rpcConditionSchema, {
        ...testRpcConditionObj,
        parameters: [TEST_CONTRACT_ADDR, 'latest'],
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({
        ...testRpcConditionObj,
        parameters: [TEST_CONTRACT_ADDR, 'latest'],
      });
    });

    it('rejects on an extra parameter', () => {
      const result = RpcCondition.validate(rpcConditionSchema, {
        ...testRpcConditionObj,
        parameters: [
          TEST_CONTRACT_ADDR,
          'latest',
          // Intentionally adding a third, invalid parameter
          '0x1234',
        ],
      });

      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        parameters: {
          _errors: ['Array must contain exactly 1 element(s)'],
        },
      });
    });
  });
});
