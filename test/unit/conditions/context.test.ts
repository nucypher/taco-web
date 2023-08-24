import { CustomContextParam } from '../../../src';
import { ConditionExpression } from '../../../src/conditions';
import { ContractCondition, RpcCondition } from '../../../src/conditions/base';
import { USER_ADDRESS_PARAM } from '../../../src/conditions/const';
import { RESERVED_CONTEXT_PARAMS } from '../../../src/conditions/context/context';
import { testWalletClient } from '../../utils';
import {
  testContractConditionObj,
  testFunctionAbi,
  testReturnValueTest,
  testRpcConditionObj,
} from '../testVariables';

jest.mock('viem/actions', () => ({
  ...jest.requireActual('viem/actions'),
  getBlock: jest.fn().mockResolvedValue({
    timestamp: 1000,
  }),
  getBlockNumber: jest.fn().mockResolvedValue(BigInt(1000)),
  requestAddresses: jest
    .fn()
    .mockResolvedValue(['0x1234567890123456789012345678901234567890']),
  signTypedData: jest
    .fn()
    .mockResolvedValue('0x1234567890123456789012345678901234567890'),
}));

describe('serialization', () => {
  it('serializes to json', async () => {
    const rpcCondition = new RpcCondition({
      ...testRpcConditionObj,
      parameters: [USER_ADDRESS_PARAM],
      returnValueTest: {
        index: 0,
        comparator: '==',
        value: USER_ADDRESS_PARAM,
      },
    });
    const conditionContext = new ConditionExpression(rpcCondition).buildContext(
      testWalletClient
    );
    const asJson = await conditionContext.toJson();
    expect(asJson).toBeDefined();
    expect(asJson).toContain(USER_ADDRESS_PARAM);
  });
});

describe('context parameters', () => {
  const customParamKey = ':customParam';
  const customParams: Record<string, CustomContextParam> = {};
  customParams[customParamKey] = 1234;

  const contractConditionObj = {
    ...testContractConditionObj,
    returnValueTest: {
      ...testReturnValueTest,
      value: customParamKey,
    },
  };
  const contractCondition = new ContractCondition(contractConditionObj);
  const conditionExpr = new ConditionExpression(contractCondition);
  const conditionContext = conditionExpr.buildContext(testWalletClient);

  describe('return value test', () => {
    it('accepts on a custom context parameters', async () => {
      const asObj = await conditionContext
        .withCustomParams(customParams)
        .toObj();
      expect(asObj).toBeDefined();
      expect(asObj[customParamKey]).toEqual(1234);
    });

    it('rejects on a missing custom context parameter', async () => {
      await expect(conditionContext.toObj()).rejects.toThrow(
        `Missing custom context parameter(s): ${customParamKey}`
      );
    });
  });

  it('rejects on using reserved context parameter', () => {
    const badCustomParams: Record<string, CustomContextParam> = {};
    RESERVED_CONTEXT_PARAMS.forEach((reservedParam) => {
      badCustomParams[reservedParam] = 'this-will-throw';
      expect(() => conditionContext.withCustomParams(badCustomParams)).toThrow(
        `Cannot use reserved parameter name ${reservedParam} as custom parameter`
      );
    });
  });

  describe('custom method parameters', () => {
    const contractConditionObj = {
      ...testContractConditionObj,
      standardContractType: undefined, // We're going to use a custom function ABI
      functionAbi: testFunctionAbi,
      method: testFunctionAbi.name,
      parameters: [USER_ADDRESS_PARAM, customParamKey], // We're going to use a custom parameter
      returnValueTest: {
        ...testReturnValueTest,
      },
    };

    it('rejects on a missing parameter ', async () => {
      const customContractCondition = new ContractCondition({
        ...contractConditionObj,
        parameters: [USER_ADDRESS_PARAM, customParamKey],
      });
      const conditionContext = new ConditionExpression(
        customContractCondition
      ).buildContext(testWalletClient);

      await expect(async () => conditionContext.toObj()).rejects.toThrow(
        `Missing custom context parameter(s): ${customParamKey}`
      );
    });

    it('accepts on a hard-coded parameter', async () => {
      const customContractCondition = new ContractCondition({
        ...contractConditionObj,
        parameters: [USER_ADDRESS_PARAM, 100],
      });
      const conditionContext = new ConditionExpression(
        customContractCondition
      ).buildContext(testWalletClient);

      const asObj = await conditionContext.toObj();
      expect(asObj).toBeDefined();
      expect(asObj[USER_ADDRESS_PARAM]).toBeDefined();
    });
  });
});
