import { SecretKey } from '@nucypher/nucypher-core';

import { CustomContextParam } from '../../../src';
import { ConditionContext, ConditionSet } from '../../../src/conditions';
import { EvmCondition, RpcCondition } from '../../../src/conditions/base';
import { USER_ADDRESS_PARAM } from '../../../src/conditions/const';
import { fakeWeb3Provider } from '../../utils';
import { testEvmConditionObj, testRpcConditionObj } from '../testVariables';

describe('condition context', () => {
  it('should serialize to JSON with context params', async () => {
    const web3Provider = fakeWeb3Provider(SecretKey.random().toBEBytes());

    const rpcCondition = new RpcCondition({
      ...testRpcConditionObj,
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
    const evmConditionObj = {
      ...testEvmConditionObj,
      standardContractType: 'ERC20',
      method: 'balanceOf',
      parameters: [USER_ADDRESS_PARAM, ':customParam'],
      returnValueTest: {
        index: 0,
        comparator: '==',
        value: USER_ADDRESS_PARAM,
      },
    };
    const evmCondition = new EvmCondition(evmConditionObj);
    const web3Provider = fakeWeb3Provider(SecretKey.random().toBEBytes());
    const conditionSet = new ConditionSet([evmCondition]);
    const conditionContext = new ConditionContext(
      conditionSet.toWASMConditions(),
      web3Provider
    );
    const myCustomParam = ':customParam';
    const customParams: Record<string, CustomContextParam> = {};
    customParams[myCustomParam] = 1234;

    it('accepts user-provided context parameters', async () => {
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

    it('accepts custom parameters in predefined methods', async () => {
      const customEvmCondition = new EvmCondition({
        ...evmConditionObj,
        parameters: [myCustomParam],
      });
      const conditionSet = new ConditionSet([customEvmCondition]);
      const conditionContext = new ConditionContext(
        conditionSet.toWASMConditions(),
        web3Provider
      );

      const asJson = await conditionContext
        .withCustomParams(customParams)
        .toJson();
      expect(asJson).toBeDefined();
      expect(asJson).toContain(myCustomParam);
    });
  });

  // TODO: Fix this test. Fails with '"method" must be [balanceOf]'
  // describe('supports custom function abi', () => {
  //   const fakeFunctionAbi = {
  //     name: 'myFunction',
  //     type: 'function',
  //     inputs: [
  //       {
  //         name: 'account',
  //         type: 'address',
  //       },
  //       {
  //         name: 'myCustomParam',
  //         type: 'uint256',
  //       },
  //     ],
  //     outputs: [
  //       {
  //         name: 'someValue',
  //         type: 'uint256',
  //       },
  //     ],
  //   };
  //   const evmConditionObj = {
  //     ...testEvmConditionObj,
  //     functionAbi: fakeFunctionAbi,
  //     method: 'myFunction',
  //     parameters: [USER_ADDRESS_PARAM, ':customParam'],
  //     returnValueTest: {
  //       index: 0,
  //       comparator: '==',
  //       value: USER_ADDRESS_PARAM,
  //     },
  //   };
  //   const evmCondition = new EvmCondition(evmConditionObj);
  //   const web3Provider = fakeWeb3Provider(SecretKey.random().toBEBytes());
  //   const conditionSet = new ConditionSet([evmCondition]);
  //   const conditionContext = new ConditionContext(
  //     conditionSet.toWASMConditions(),
  //     web3Provider
  //   );
  //   const myCustomParam = ':customParam';
  //   const customParams: Record<string, CustomContextParam> = {};
  //   customParams[myCustomParam] = 1234;
  //
  //   it('accepts custom function abi', async () => {
  //     const asJson = await conditionContext
  //       .withCustomParams(customParams)
  //       .toJson();
  //     expect(asJson).toBeDefined();
  //     expect(asJson).toContain(USER_ADDRESS_PARAM);
  //     expect(asJson).toContain(myCustomParam);
  //   });
  // });
});
