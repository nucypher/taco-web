import { TEST_CONTRACT_ADDR } from '@nucypher/test-utils';
import { describe, expect, it } from 'vitest';

import {
  RpcCondition,
  rpcConditionSchema,
  RpcConditionType,
} from '../../../src/conditions/base/rpc';
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
          "Invalid enum value. Expected 'eth_getBalance', received 'fake_invalid_method'",
        ],
      },
    });
  });

  it('infers condition type from constructor', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { conditionType, ...withoutType } = testRpcConditionObj;
    const condition = new RpcCondition(testRpcConditionObj);
    expect(condition.value.conditionType).toEqual(RpcConditionType);
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

    it('accepts a single UserAddress as address', () => {
      const result = RpcCondition.validate(rpcConditionSchema, {
        ...testRpcConditionObj,
        parameters: [":userAddress"],
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({
        ...testRpcConditionObj,
        parameters: [":userAddress"],
      });
    });

    it('accepts a single context variable as address', () => {
      const result = RpcCondition.validate(rpcConditionSchema, {
        ...testRpcConditionObj,
        parameters: [":testContextVar"],
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({
        ...testRpcConditionObj,
        parameters: [":testContextVar"],
      });
    });

    it('accepts a single address and a block number', () => {
      const result = RpcCondition.validate(rpcConditionSchema, {
        ...testRpcConditionObj,
        parameters: [TEST_CONTRACT_ADDR, 2345],
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({
        ...testRpcConditionObj,
        parameters: [TEST_CONTRACT_ADDR, 2345],
      });
    });

    it('accepts context params for address and block number', () => {
      const result = RpcCondition.validate(rpcConditionSchema, {
        ...testRpcConditionObj,
        parameters: [":testAddress", ":testBlockNumber"],
      });

      expect(result.error).toBeUndefined();
      expect(result.data).toEqual({
        ...testRpcConditionObj,
        parameters: [":testAddress", ":testBlockNumber"],
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
          _errors: ['Array must contain at most 2 element(s)'],
        },
      });
    });

    it('rejects empty parameters', () => {
      const rpcObj = {
        ...testRpcConditionObj,
        parameters: [], // Update this after updating available RPC methods
      };

      const result = RpcCondition.validate(rpcConditionSchema, rpcObj);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        parameters: {
          _errors: ['Array must contain at least 2 element(s)', 'Array must contain at least 1 element(s)'],
        },
      });
    });

    it('rejects non-array parameters', () => {
      const badRpcObj = {
        ...testRpcConditionObj,
        parameters: 'not an array',
      };

      const result = RpcCondition.validate(rpcConditionSchema, badRpcObj);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.error?.format()).toMatchObject({
        parameters: {
          _errors: [
            // Expecting two errors here because of the nested array-tuple in the parameters schema
            'Expected array, received string',
            'Expected array, received string',
          ],
        },
      });
    });
  });
});
