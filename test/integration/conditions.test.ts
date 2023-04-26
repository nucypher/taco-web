import { SecretKey } from '@nucypher/nucypher-core';

import {
  ConditionContext,
  Conditions,
  ConditionSet,
  Operator,
} from '../../src';
import { mockWeb3Provider } from '../utils';

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
  const condition = new Conditions.ERC721Balance();
  let result = condition.validate({
    contractAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  });

  it('should validate', async () => {
    expect(result.error).toEqual(undefined);
    expect(result.value.contractAddress).toEqual(
      '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
    );
  });

  result = condition.validate({ chain: 5 });
  it('should update the value of "chain"', async () => {
    expect(result.error).toEqual(undefined);
    expect(result.value.chain).toEqual(5);
  });

  it('should validate chain id', async () => {
    result = condition.validate({ chain: 10 });
    expect(result.error?.message).toEqual(
      '"chain" must be one of [1, 5, 137, 80001]'
    );
  });
});

describe('condition set', () => {
  const genuineUndead = new Conditions.ERC721Balance({
    contractAddress: '0x209e639a0EC166Ac7a1A4bA41968fa967dB30221',
  });
  const gnomePals = new Conditions.ERC721Balance({
    contractAddress: '0x5dB11d7356aa4C0E85Aa5b255eC2B5F81De6d4dA',
  });
  const conditions = new ConditionSet([
    genuineUndead,
    Conditions.OR,
    gnomePals,
  ]);

  it('should validate', async () => {
    expect(conditions.validate()).toEqual(true);
  });
});

describe('conditions set to/from json', () => {
  const json =
    '[{"chain":5,"method":"ownerOf","parameters":["3591"],"standardContractType":"ERC721","returnValueTest":{"comparator":"==","value":":userAddress"},"contractAddress":"0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77"}]';
  const conditionSet = ConditionSet.fromJSON(json);

  it('should be a ConditionSet', async () => {
    expect(conditionSet.conditions[0].toObj().contractAddress).toEqual(
      '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'
    );
    expect(conditionSet.toJson()).toEqual(json);
  });
});

describe('standard conditions types validation', () => {
  const returnValueTest = {
    comparator: '>',
    value: '100',
  };

  describe('works for valid conditions', () => {
    it('timelock', () => {
      const timelock = new Conditions.TimelockCondition({
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
      const rpc = new Conditions.RpcCondition(rpcCondition);
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
      const evm = new Conditions.EvmCondition(evmCondition);
      expect(evm.toObj()).toEqual(evmCondition);
    });
  });

  describe('fails for invalid conditions', () => {
    it('invalid timelock', () => {
      const badTimelockCondition = {
        // Intentionally replacing `returnValueTest` with an invalid test
        returnValueTest: {
          comparator: 'not-a-comparator',
          value: '100',
        },
      };
      const badTimelock = new Conditions.TimelockCondition(
        badTimelockCondition
      );
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
      const badRpc = new Conditions.RpcCondition(badRpcCondition);
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
      const badEvm = new Conditions.EvmCondition(badEvmCondition);
      expect(() => badEvm.toObj()).toThrow('"contractAddress" is required');
      const { error } = badEvm.validate(badEvmCondition);
      expect(error?.message).toEqual('"contractAddress" is required');
    });
  });
});

describe('produce context parameters from conditions', () => {
  describe('from rpc condition', () => {
    const methods = Conditions.RpcCondition.RPC_METHODS;
    methods.forEach((method) => {
      const contextParams =
        Conditions.RpcCondition.CONTEXT_PARAMETERS_PER_METHOD[method];
      if (!contextParams) {
        return;
      }
      contextParams.forEach((contextParam) => {
        it(`produces context parameter ${contextParam} for method ${method}`, () => {
          const rpcCondition = new Conditions.RpcCondition({
            chain: 5,
            method,
            parameters: [contextParam],
            returnValueTest: {
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
    Conditions.EvmCondition.STANDARD_CONTRACT_TYPES.forEach((contractType) => {
      const methods =
        Conditions.EvmCondition.METHODS_PER_CONTRACT_TYPE[contractType];
      if (!methods) {
        return;
      }
      methods.forEach((method) => {
        const contextParams =
          Conditions.EvmCondition.CONTEXT_PARAMETERS_PER_METHOD[method];
        if (!contextParams) {
          return;
        }
        contextParams.forEach((contextParam) => {
          it(`produces context parameter ${contextParam} for method ${method}`, () => {
            const evmCondition = new Conditions.EvmCondition({
              contractAddress: '0x0000000000000000000000000000000000000000',
              chain: 5,
              standardContractType: 'ERC20',
              method: 'balanceOf',
              parameters: [contextParam],
              returnValueTest: {
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
    const web3Provider = mockWeb3Provider(SecretKey.random().toBEBytes());

    const rpcCondition = new Conditions.RpcCondition({
      chain: 5,
      method: 'eth_getBalance',
      parameters: [':userAddress'],
      returnValueTest: {
        comparator: '==',
        value: ':userAddress',
      },
    });
    const conditionSet = new ConditionSet([rpcCondition]);

    const conditionContext = new ConditionContext(
      conditionSet.toWASMConditions(),
      web3Provider
    );
    const asJson = await conditionContext.toJson();
    expect(asJson).toBeDefined();
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
        comparator: '==',
        value: ':userAddress',
      },
    };
    const standardContractType = 'ERC20';
    const functionAbi = { fake_function_abi: true };

    it('accepts standardContractType', () => {
      const conditionJson = { ...baseEvmCondition, standardContractType };
      const evmCondition = new Conditions.EvmCondition(conditionJson);
      expect(evmCondition.toObj()).toEqual(conditionJson);
    });

    it('accepts functionAbi', () => {
      const conditionJson = { ...baseEvmCondition, functionAbi };
      const evmCondition = new Conditions.EvmCondition(conditionJson);
      expect(evmCondition.toObj()).toEqual(conditionJson);
    });

    it('rejects both', () => {
      const conditionJson = {
        ...baseEvmCondition,
        standardContractType,
        functionAbi,
      };
      const evmCondition = new Conditions.EvmCondition(conditionJson);
      expect(() => evmCondition.toObj()).toThrow(
        '"value" contains a conflict between exclusive peers [standardContractType, functionAbi]'
      );
    });

    it('rejects none', () => {
      const evmCondition = new Conditions.EvmCondition(baseEvmCondition);
      expect(() => evmCondition.toObj()).toThrow(
        '"value" must contain at least one of [standardContractType, functionAbi]'
      );
    });
  });
});
