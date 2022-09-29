import { SecretKey } from '@nucypher/nucypher-core';

import { ConditionContext, Conditions, ConditionSet } from '../../src';
import { Operator } from '../../src';
import { Web3Provider } from '../../src/web3';
import { mockWeb3Provider } from '../utils';

describe('operator', () => {
  it('should validate Operator operator validation', async () => {
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

  result = condition.validate({ chain: 'ethereum' });
  it('should update the value of "chain"', async () => {
    expect(result.error).toEqual(undefined);
    expect(result.value.chain).toEqual('ethereum');
  });
});

describe('condition set', () => {
  const genuineUndead = new Conditions.ERC721Balance({
    contractAddress: '0x209e639a0EC166Ac7a1A4bA41968fa967dB30221',
  });
  const gnomePals = new Conditions.ERC721Balance({
    contractAddress: '0x5dB11d7356aa4C0E85Aa5b255eC2B5F81De6d4dA',
  });
  const or = new Operator('or');
  const conditions = new ConditionSet([genuineUndead, or, gnomePals]);

  it('should validate', async () => {
    expect(conditions.validate()).toEqual(true);
  });
});

describe('conditions set to/from json', () => {
  const json =
    '[{"chain":"ethereum","method":"ownerOf","parameters":["3591"],"standardContractType":"ERC721","returnValueTest":{"comparator":"==","value":":userAddress"},"contractAddress":"0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77"}]';
  const conditionset = ConditionSet.fromJSON(json);

  it('should be a ConditionSet', async () => {
    expect(conditionset.conditions[0].toObj().contractAddress).toEqual(
      '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'
    );
    expect(conditionset.toJson()).toEqual(json);
  });
});

// TODO: Test negative cases where schema validation fails
describe('conditions types', () => {
  const returnValueTest = {
    comparator: '>',
    value: '100',
  };

  it('timelock', async () => {
    const timelockCondition = {
      returnValueTest,
    };
    const timelock = new Conditions.TimelockCondition(timelockCondition);
    expect(timelock.toObj()).toEqual({
      returnValueTest,
      method: 'timelock',
    });
  });

  it('rpc', async () => {
    const rpcCondition = {
      chain: 'ethereum',
      method: 'eth_getBalance',
      parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'],
      returnValueTest,
    };
    const rpc = new Conditions.RpcCondition(rpcCondition);
    expect(rpc.toObj()).toEqual(rpcCondition);
  });

  it('evm', async () => {
    const evmCondition = {
      contractAddress: '0x0000000000000000000000000000000000000000',
      chain: 'ethereum',
      standardContractType: 'ERC20',
      method: 'balanceOf',
      parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'],
      returnValueTest,
    };
    const evm = new Conditions.EvmCondition(evmCondition);
    expect(evm.toObj()).toEqual(evmCondition);
  });

  it('malformed evm', async () => {
    const badEvmCondition = {
      // Intentionally removing `contractAddress`
      // contractAddress: '0x0000000000000000000000000000000000000000',
      chain: 'ethereum',
      standardContractType: 'ERC20',
      method: 'balanceOf',
      parameters: ['0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77'],
      returnValueTest,
    };
    const badCondition = new Conditions.EvmCondition(badEvmCondition);
    expect(() => badCondition.toObj()).toThrow('"contractAddress" is required');

    const { error } = badCondition.validate(badEvmCondition);
    expect(error?.message).toEqual('"contractAddress" is required');
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
            chain: 'ethereum',
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
              chain: 'ethereum',
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
    const provider = mockWeb3Provider(SecretKey.random().toSecretBytes());
    const web3Provider = Web3Provider.fromEthersWeb3Provider(provider);

    const rpcCondition = new Conditions.RpcCondition({
      chain: 'ethereum',
      method: 'eth_getBalance',
      parameters: [':userAddress'],
      returnValueTest: {
        comparator: '==',
        value: ':userAddress',
      },
    });
    const conditionSet = new ConditionSet([rpcCondition]);

    const conditionContext = new ConditionContext(conditionSet, web3Provider);
    const asJson = await conditionContext.toJson();
    expect(asJson).toBeDefined();
  });
});
