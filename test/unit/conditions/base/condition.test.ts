import {
  EvmCondition,
  EvmConditionConfig,
} from '../../../../src/conditions/base/evm';
import {
  RpcCondition,
  RpcConditionConfig,
} from '../../../../src/conditions/base/rpc';
import { ERC721Balance } from '../../../../src/conditions/predefined';
import {
  TEST_CHAIN_ID,
  TEST_CONTRACT_ADDR,
  testEvmConditionObj,
  testReturnValueTest,
  testRpcConditionObj,
} from '../../testVariables';

describe('validation', () => {
  const condition = new ERC721Balance();
  let result = condition.validate({
    contractAddress: TEST_CONTRACT_ADDR,
    chain: TEST_CHAIN_ID,
  });

  it('accepts a correct schema', async () => {
    expect(result.error).toBeUndefined();
    expect(result.value.contractAddress).toEqual(TEST_CONTRACT_ADDR);
  });

  it('updates on a valid schema value', async () => {
    result = condition.validate({ chain: TEST_CHAIN_ID });
    expect(result.error).toBeUndefined();
    expect(result.value.chain).toEqual(TEST_CHAIN_ID);
  });

  it('rejects on an invalid schema value', async () => {
    result = condition.validate({ chain: -1 });
    expect(result.error?.message).toEqual(
      '"chain" must be one of [1, 5, 137, 80001]'
    );
  });
});

describe('get context parameters from conditions', () => {
  describe('from rpc condition', () => {
    const methods = RpcConditionConfig.RPC_METHODS;
    methods.forEach((method) => {
      const contextParams =
        RpcConditionConfig.CONTEXT_PARAMETERS_PER_METHOD[
          method as keyof RpcConditionConfig
        ];
      if (!contextParams) {
        return;
      }
      contextParams.forEach((contextParam) => {
        it(`gets ${contextParam} for method ${method}`, () => {
          const rpcCondition = new RpcCondition({
            ...testRpcConditionObj,
            method,
            parameters: [contextParam],
            returnValueTest: {
              ...testReturnValueTest,
              value: contextParam,
            },
          });

          const producedContextParam = rpcCondition.getContextParameters();
          expect(producedContextParam).toEqual([contextParam]);
        });
      });
    });
  });

  describe('from evm condition', () => {
    EvmConditionConfig.STANDARD_CONTRACT_TYPES.forEach((contractType) => {
      const methods =
        EvmConditionConfig.METHODS_PER_CONTRACT_TYPE[contractType];
      if (!methods) {
        return;
      }
      methods.forEach((method) => {
        const contextParams =
          EvmConditionConfig.CONTEXT_PARAMETERS_PER_METHOD[method];
        if (!contextParams) {
          return;
        }
        contextParams.forEach((contextParam) => {
          it(`gets ${contextParam} for method ${method}`, () => {
            const evmCondition = new EvmCondition({
              ...testEvmConditionObj,
              parameters: [contextParam],
              returnValueTest: {
                ...testReturnValueTest,
                value: contextParam,
              },
            });
            const producedContextParam = evmCondition.getContextParameters();
            expect(producedContextParam).toEqual([contextParam]);
          });
        });
      });
    });
  });
});
