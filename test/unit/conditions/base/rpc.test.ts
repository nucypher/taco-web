import { RpcCondition } from '../../../../src/conditions/base';
import { testRpcConditionObj } from '../../testVariables';

describe('validation', () => {
  it('accepts on a valid schema', () => {
    const result = new RpcCondition(testRpcConditionObj).validate();

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(testRpcConditionObj);
  });

  it('rejects an invalid schema', () => {
    const badRpcObj = {
      ...testRpcConditionObj,
      // Intentionally replacing `method` with an invalid method
      method: 'fake_invalid_method',
    } as unknown as typeof testRpcConditionObj;

    const result = new RpcCondition(badRpcObj).validate();

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
});
