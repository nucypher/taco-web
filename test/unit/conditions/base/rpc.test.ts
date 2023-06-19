import { RpcCondition } from '../../../../src/conditions/base';
import { testRpcConditionObj } from '../../testVariables';

describe('validation', () => {
  it('accepts on a valid schema', () => {
    const rpc = new RpcCondition(testRpcConditionObj);
    expect(rpc.toObj()).toEqual({
      ...testRpcConditionObj,
    });
  });

  it('rejects an invalid schema', () => {
    const badRpcObj = {
      ...testRpcConditionObj,
      // Intentionally replacing `method` with an invalid method
      method: 'fake_invalid_method',
    };

    const badRpc = new RpcCondition(badRpcObj);
    expect(() => badRpc.toObj()).toThrow(
      'Invalid condition: "method" must be one of [eth_getBalance, balanceOf]'
    );

    const { error } = badRpc.validate(badRpcObj);
    expect(error?.message).toEqual(
      '"method" must be one of [eth_getBalance, balanceOf]'
    );
  });
});
