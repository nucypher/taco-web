import { test } from 'vitest';

import { ConditionExpression, CustomContextParam } from '../../../src';
import { ContractCondition, RpcCondition } from '../../../src/conditions/base';
import { USER_ADDRESS_PARAM } from '../../../src/conditions/const';
import { RESERVED_CONTEXT_PARAMS } from '../../../src/conditions/context/context';
import { fakeProvider, fakeSigner } from '../../utils';
import {
  testContractConditionObj,
  testFunctionAbi,
  testReturnValueTest,
  testRpcConditionObj,
} from '../testVariables';

const provider = fakeProvider();
const signer = fakeSigner();

test('serialization', () => {
  test('serializes to json', async () => {
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
      provider,
      {},
      signer,
    );
    const asJson = await conditionContext.toJson();
    expect(asJson).toBeDefined();
    expect(asJson).toContain(USER_ADDRESS_PARAM);
  });
});

test('context parameters', () => {
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
  const conditionContext = conditionExpr.buildContext(provider, {}, signer);

  test('return value test', () => {
    test('accepts on a custom context parameters', async () => {
      const asObj = await conditionContext
        .withCustomParams(customParams)
        .toObj();
      expect(asObj).toBeDefined();
      expect(asObj[customParamKey]).toEqual(1234);
    });

    test('rejects on a missing custom context parameter', async () => {
      await expect(conditionContext.toObj()).rejects.toThrow(
        `Missing custom context parameter(s): ${customParamKey}`,
      );
    });
  });

  test('rejects on using reserved context parameter', () => {
    const badCustomParams: Record<string, CustomContextParam> = {};
    RESERVED_CONTEXT_PARAMS.forEach((reservedParam) => {
      badCustomParams[reservedParam] = 'this-will-throw';
      expect(() => conditionContext.withCustomParams(badCustomParams)).toThrow(
        `Cannot use reserved parameter name ${reservedParam} as custom parameter`,
      );
    });
  });

  test('detects if a signer is required', () => {
    const conditionObj = {
      ...testContractConditionObj,
      returnValueTest: {
        ...testReturnValueTest,
        value: USER_ADDRESS_PARAM,
      },
    };
    const condition = new ContractCondition(conditionObj);
    const conditionExpr = new ConditionExpression(condition);
    expect(conditionExpr.contextRequiresSigner()).toBe(true);
    expect(conditionExpr.buildContext(provider, {}, signer)).toBeDefined();
    expect(() => conditionExpr.buildContext(provider, {})).toThrow(
      `Signer required to satisfy ${USER_ADDRESS_PARAM} context variable in condition`,
    );
  });

  test('detects if a signer is not required', () => {
    const condition = new RpcCondition(testRpcConditionObj);
    const conditionExpr = new ConditionExpression(condition);
    expect(JSON.stringify(condition.toObj()).includes(USER_ADDRESS_PARAM)).toBe(
      false,
    );
    expect(conditionExpr.contextRequiresSigner()).toBe(false);
    expect(conditionExpr.buildContext(provider, {}, signer)).toBeDefined();
    expect(conditionExpr.buildContext(provider, {})).toBeDefined();
  });

  test('rejects on a missing signer', () => {
    const conditionObj = {
      ...testContractConditionObj,
      returnValueTest: {
        ...testReturnValueTest,
        value: USER_ADDRESS_PARAM,
      },
    };
    const condition = new ContractCondition(conditionObj);
    const conditionExpr = new ConditionExpression(condition);
    expect(conditionExpr.contextRequiresSigner()).toBe(true);
    expect(() => conditionExpr.buildContext(provider, {}, undefined)).toThrow(
      `Signer required to satisfy ${USER_ADDRESS_PARAM} context variable in condition`,
    );
  });

  test('rejects on a missing signer', () => {
    const conditionObj = {
      ...testContractConditionObj,
      returnValueTest: {
        ...testReturnValueTest,
        value: USER_ADDRESS_PARAM,
      },
    };
    const condition = new ContractCondition(conditionObj);
    const conditionExpr = new ConditionExpression(condition);
    expect(conditionExpr.contextRequiresSigner()).toBe(true);
    expect(() => conditionExpr.buildContext(provider, {}, undefined)).toThrow(
      `Signer required to satisfy ${USER_ADDRESS_PARAM} context variable in condition`,
    );
  });

  test('custom method parameters', () => {
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

    test('rejects on a missing parameter ', async () => {
      const customContractCondition = new ContractCondition({
        ...contractConditionObj,
        parameters: [USER_ADDRESS_PARAM, customParamKey],
      });
      const conditionContext = new ConditionExpression(
        customContractCondition,
      ).buildContext(provider, {}, signer);

      await expect(async () => conditionContext.toObj()).rejects.toThrow(
        `Missing custom context parameter(s): ${customParamKey}`,
      );
    });

    test('accepts on a hard-coded parameter', async () => {
      const customContractCondition = new ContractCondition({
        ...contractConditionObj,
        parameters: [USER_ADDRESS_PARAM, 100],
      });
      const conditionContext = new ConditionExpression(
        customContractCondition,
      ).buildContext(provider, {}, signer);

      const asObj = await conditionContext.toObj();
      expect(asObj).toBeDefined();
      expect(asObj[USER_ADDRESS_PARAM]).toBeDefined();
    });
  });
});
