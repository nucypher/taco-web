import { SecretKey } from '@nucypher/nucypher-core';

import { conditions, CustomContextParam } from '../../src';
import { RpcConditionConfig } from '../../src/conditions/base/rpc';
import { USER_ADDRESS_PARAM } from '../../src/conditions/const';
import { fakeWeb3Provider } from '../utils';

const {
  predefined: { ERC721Balance },
  base: { TimelockCondition, RpcCondition, EvmCondition },
  Operator,
  ConditionSet,
  ConditionContext,
} = conditions;

const TEST_CONTRACT_ADDR = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
const TEST_CONTRACT_ADDR_2 = '0x5dB11d7356aa4C0E85Aa5b255eC2B5F81De6d4dA';
const TEST_CHAIN_ID = 5;

describe('operator', () => {
  it('should validate Operator', async () => {
    const op = new Operator('or');
    expect(op.operator).toEqual('or');
    expect(() => {
      new Operator('then');
    }).toThrow();
  });
});

describe('conditions schema', () => {
  const condition = new ERC721Balance();
  let result = condition.validate({
    contractAddress: TEST_CONTRACT_ADDR,
  });

  it('should validate', async () => {
    expect(result.error).toEqual(undefined);
    expect(result.value.contractAddress).toEqual(TEST_CONTRACT_ADDR);
  });

  result = condition.validate({ chain: TEST_CHAIN_ID });
  it('should update the value of "chain"', async () => {
    expect(result.error).toEqual(undefined);
    expect(result.value.chain).toEqual(TEST_CHAIN_ID);
  });

  it('should validate chain id', async () => {
    result = condition.validate({ chain: 10 });
    expect(result.error?.message).toEqual(
      '"chain" must be one of [1, 5, 137, 80001]'
    );
  });
});

describe('condition set', () => {
  const genuineUndead = new ERC721Balance({
    contractAddress: TEST_CONTRACT_ADDR,
  });
  const gnomePals = new ERC721Balance({
    contractAddress: TEST_CONTRACT_ADDR_2,
  });
  const conditions = new ConditionSet([genuineUndead, Operator.AND, gnomePals]);

  it('should validate', async () => {
    expect(conditions.validate()).toEqual(true);
  });
});

describe('conditions set to/from json', () => {
  const json = `[{"chain":${TEST_CHAIN_ID},"method":"ownerOf","parameters":["3591"],"standardContractType":"ERC721","returnValueTest":{"comparator":"==","value":":userAddress"},"contractAddress":"${TEST_CONTRACT_ADDR}"}]`;
  const conditionSet = ConditionSet.fromJSON(json);

  it('should be a ConditionSet', async () => {
    expect(conditionSet.conditions[0].toObj().contractAddress).toEqual(
      TEST_CONTRACT_ADDR
    );
    expect(conditionSet.toJson()).toEqual(json);
  });
});

describe('standard conditions types validation', () => {
  const returnValueTest = {
    index: 0,
    comparator: '>',
    value: '100',
  };

  describe('works for valid conditions', () => {
    it('timelock', () => {
      const timelock = new TimelockCondition({
        returnValueTest,
      });
      expect(timelock.toObj()).toEqual({
        returnValueTest,
        method: 'timelock',
      });
    });

    it('rpc', () => {
      const rpcCondition = {
        chain: 5,
        method: 'eth_getBalance',
        parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'],
        returnValueTest,
      };
      const rpc = new RpcCondition(rpcCondition);
      expect(rpc.toObj()).toEqual(rpcCondition);
    });

    it('evm', () => {
      const evmCondition = {
        contractAddress: '0x0000000000000000000000000000000000000000',
        chain: 5,
        standardContractType: 'ERC20',
        method: 'balanceOf',
        parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'],
        returnValueTest,
      };
      const evm = new EvmCondition(evmCondition);
      expect(evm.toObj()).toEqual(evmCondition);
    });
  });

  describe('fails for invalid conditions', () => {
    it('invalid timelock', () => {
      const badTimelockCondition = {
        // Intentionally replacing `returnValueTest` with an invalid test
        returnValueTest: {
          index: 0,
          comparator: 'not-a-comparator',
          value: '100',
        },
      };
      const badTimelock = new TimelockCondition(badTimelockCondition);
      expect(() => badTimelock.toObj()).toThrow(
        '"returnValueTest.comparator" must be one of [==, >, <, >=, <=, !=]'
      );
      const { error } = badTimelock.validate(badTimelockCondition);
      expect(error?.message).toEqual(
        '"returnValueTest.comparator" must be one of [==, >, <, >=, <=, !=]'
      );
    });

    it('invalid rpc', () => {
      const badRpcCondition = {
        chain: 5,
        // Intentionally replacing `method` with an invalid method
        method: 'fake_invalid_method',
        parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'],
        returnValueTest,
      };
      const badRpc = new RpcCondition(badRpcCondition);
      expect(() => badRpc.toObj()).toThrow(
        '"method" must be one of [eth_getBalance, balanceOf]'
      );
      const { error } = badRpc.validate(badRpcCondition);
      expect(error?.message).toEqual(
        '"method" must be one of [eth_getBalance, balanceOf]'
      );
    });

    it('invalid evm', () => {
      const badEvmCondition = {
        // Intentionally removing `contractAddress`
        // contractAddress: '0x0000000000000000000000000000000000000000',
        chain: 5,
        standardContractType: 'ERC20',
        method: 'balanceOf',
        parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'],
        returnValueTest,
      };
      const badEvm = new EvmCondition(badEvmCondition);
      expect(() => badEvm.toObj()).toThrow('"contractAddress" is required');
      const { error } = badEvm.validate(badEvmCondition);
      expect(error?.message).toEqual('"contractAddress" is required');
    });
  });
});

describe('produce context parameters from conditions', () => {
  describe('from rpc condition', () => {
    const methods = RpcConditionConfig.RPC_METHODS;
    methods.forEach((method) => {
      const contextParams =
        RpcConditionConfig.CONTEXT_PARAMETERS_PER_METHOD[
          method as keyof typeof RpcConditionConfig.CONTEXT_PARAMETERS_PER_METHOD
        ];
      if (!contextParams) {
        return;
      }
      contextParams.forEach((contextParam) => {
        it(`produces context parameter ${contextParam} for method ${method}`, () => {
          const rpcCondition = new RpcCondition({
            chain: 5,
            method,
            parameters: [contextParam],
            returnValueTest: {
              index: 0,
              comparator: '==',
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
    EvmCondition.STANDARD_CONTRACT_TYPES.forEach((contractType) => {
      const methods = EvmCondition.METHODS_PER_CONTRACT_TYPE[contractType];
      if (!methods) {
        return;
      }
      methods.forEach((method) => {
        const contextParams =
          EvmCondition.CONTEXT_PARAMETERS_PER_METHOD[method];
        if (!contextParams) {
          return;
        }
        contextParams.forEach((contextParam) => {
          it(`produces context parameter ${contextParam} for method ${method}`, () => {
            const evmCondition = new EvmCondition({
              contractAddress: '0x0000000000000000000000000000000000000000',
              chain: 5,
              standardContractType: 'ERC20',
              method: 'balanceOf',
              parameters: [contextParam],
              returnValueTest: {
                index: 0,
                comparator: '==',
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

describe('condition context', () => {
  it('should serialize to JSON with context params', async () => {
    const web3Provider = fakeWeb3Provider(SecretKey.random().toBEBytes());

    const rpcCondition = new RpcCondition({
      chain: 5,
      method: 'eth_getBalance',
      parameters: [USER_ADDRESS_PARAM],
      returnValueTest: {
        index: 0,
        comparator: '==',
        value: USER_ADDRESS_PARAM,
      },
    });
    const conditionSet = new ConditionSet([rpcCondition]);

    const conditionContext = new ConditionContext(
      conditionSet.toWASMConditions(),
      web3Provider
    );
    const asJson = await conditionContext.toJson();
    expect(asJson).toContain(USER_ADDRESS_PARAM);
  });

  describe('supports user-defined parameters', () => {
    const fakeFunctionAbi = {
      name: 'myFunction',
      type: 'function',
      inputs: [
        {
          name: 'account',
          type: 'address',
        },
        {
          name: 'myCustomParam',
          type: 'uint256',
        },
      ],
      outputs: [
        {
          name: 'someValue',
          type: 'uint256',
        },
      ],
    };
    const evmCondition = new EvmCondition({
      chain: 5,
      functionAbi: fakeFunctionAbi,
      method: 'balanceOf',
      contractAddress: '0x0000000000000000000000000000000000000000',
      parameters: [USER_ADDRESS_PARAM, ':customParam'],
      returnValueTest: {
        index: 0,
        comparator: '==',
        value: USER_ADDRESS_PARAM,
      },
    });
    const web3Provider = fakeWeb3Provider(SecretKey.random().toBEBytes());
    const conditionSet = new ConditionSet([evmCondition]);
    const conditionContext = new ConditionContext(
      conditionSet.toWASMConditions(),
      web3Provider
    );
    const myCustomParam = ':customParam';

    it('parses user-provided context parameters', async () => {
      const customParams: Record<string, CustomContextParam> = {};
      customParams[myCustomParam] = 1234;
      const asJson = await conditionContext
        .withCustomParams(customParams)
        .toJson();
      expect(asJson).toBeDefined();
      expect(asJson).toContain(USER_ADDRESS_PARAM);
      expect(asJson).toContain(myCustomParam);
    });

    it('throws on missing custom context param', async () => {
      await expect(conditionContext.toJson()).rejects.toThrow(
        `Missing custom context parameter ${myCustomParam}`
      );
    });

    it('throws on using reserved context parameter identifiers', () => {
      const badCustomParams: Record<string, CustomContextParam> = {};
      badCustomParams[USER_ADDRESS_PARAM] = 'this-will-throw';

      expect(() => conditionContext.withCustomParams(badCustomParams)).toThrow(
        `Cannot use reserved parameter name ${USER_ADDRESS_PARAM} as custom parameter`
      );
    });
  });
});

describe('evm condition', () => {
  describe('accepts either standardContractType or functionAbi but not both or none', () => {
    const baseEvmCondition = {
      contractAddress: '0x0000000000000000000000000000000000000000',
      chain: 5,
      method: 'balanceOf',
      parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'],
      returnValueTest: {
        index: 0,
        comparator: '==',
        value: USER_ADDRESS_PARAM,
      },
    };
    const standardContractType = 'ERC20';
    const functionAbi = { fake_function_abi: true };

    it('accepts standardContractType', () => {
      const conditionJson = { ...baseEvmCondition, standardContractType };
      const evmCondition = new EvmCondition(conditionJson);
      expect(evmCondition.toObj()).toEqual(conditionJson);
    });

    it('accepts functionAbi', () => {
      const conditionJson = { ...baseEvmCondition, functionAbi };
      const evmCondition = new EvmCondition(conditionJson);
      expect(evmCondition.toObj()).toEqual(conditionJson);
    });

    it('rejects both', () => {
      const conditionJson = {
        ...baseEvmCondition,
        standardContractType,
        functionAbi,
      };
      const evmCondition = new EvmCondition(conditionJson);
      expect(() => evmCondition.toObj()).toThrow(
        '"value" contains a conflict between exclusive peers [standardContractType, functionAbi]'
      );
    });

    it('rejects none', () => {
      const evmCondition = new EvmCondition(baseEvmCondition);
      expect(() => evmCondition.toObj()).toThrow(
        '"value" must contain at least one of [standardContractType, functionAbi]'
      );
    });
  });
});
