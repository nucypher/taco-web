import {initialize} from '@nucypher/nucypher-core';
import {fakeProvider, fakeSigner} from '@nucypher/test-utils';
import {ethers} from 'ethers';
import {beforeAll, describe, expect, it} from 'vitest';

import {toBytes, toHexString} from '../../src';
import {
  ConditionExpression,
  ContractCondition,
  CustomContextParam,
  RpcCondition,
} from '../../src/conditions';
import {paramOrContextParamSchema} from '../../src/conditions/base/shared';
import {USER_ADDRESS_PARAM} from '../../src/conditions/const';
import {RESERVED_CONTEXT_PARAMS} from '../../src/conditions/context/context';
import {
  testContractConditionObj,
  testFunctionAbi,
  testReturnValueTest,
  testRpcConditionObj,
} from '../test-utils';

describe('context', () => {
  let provider: ethers.providers.Provider;
  let signer: ethers.Signer;

  beforeAll(async () => {
    await initialize();
    provider = fakeProvider();
    signer = fakeSigner();
  });

  describe('serialization', () => {
    it('serializes to json', async () => {
      const rpcCondition = new RpcCondition({
        ...testRpcConditionObj,
        parameters: [USER_ADDRESS_PARAM],
        returnValueTest: {
          comparator: '==',
          value: USER_ADDRESS_PARAM,
        },
      });
      const conditionContext = new ConditionExpression(
        rpcCondition,
      ).buildContext(provider, {}, signer);
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
    const context = conditionExpr.buildContext(provider, {}, signer);

    describe('custom parameters', () => {
      it('serializes bytes as hex strings', async () => {
        const customParamsWithBytes: Record<string, CustomContextParam> = {};
        const customParam = toBytes('hello');
        // Uint8Array is not a valid CustomContextParam, override the type:
        customParamsWithBytes[customParamKey] =
          customParam as unknown as string;

        const asJson = await context
          .withCustomParams(customParamsWithBytes)
          .toJson();
        const asObj = JSON.parse(asJson);
        expect(asObj).toBeDefined();
        expect(asObj[customParamKey]).toEqual(`0x${toHexString(customParam)}`);
      });
    });

    describe('return value test', () => {
      it('accepts on a custom context parameters', async () => {
        const asObj = await context.withCustomParams(customParams).toObj();
        expect(asObj).toBeDefined();
        expect(asObj[customParamKey]).toEqual(1234);
      });

      it('rejects on a missing custom context parameter', async () => {
        await expect(context.toObj()).rejects.toThrow(
          `Missing custom context parameter(s): ${customParamKey}`,
        );
      });
    });

    it('rejects on using reserved context parameter', () => {
      const badCustomParams: Record<string, CustomContextParam> = {};
      RESERVED_CONTEXT_PARAMS.forEach((reservedParam) => {
        badCustomParams[reservedParam] = 'this-will-throw';
        expect(() => context.withCustomParams(badCustomParams)).toThrow(
          `Cannot use reserved parameter name ${reservedParam} as custom parameter`,
        );
      });
    });

    it('rejects on using a custom parameter that was not requested', async () => {
      const badCustomParamKey = ':notRequested';
      const badCustomParams: Record<string, CustomContextParam> = {};
      badCustomParams[':customParam'] = 'this-is-fine';
      badCustomParams[badCustomParamKey] = 'this-will-throw';
      await expect(
        context.withCustomParams(badCustomParams).toObj(),
      ).rejects.toThrow(
        `Unknown custom context parameter(s): ${badCustomParamKey}`,
      );
    });

    it('detects if a signer is required', () => {
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

    it('detects if a signer is not required', () => {
      const condition = new RpcCondition(testRpcConditionObj);
      const conditionExpr = new ConditionExpression(condition);
      expect(
        JSON.stringify(condition.toObj()).includes(USER_ADDRESS_PARAM),
      ).toBe(false);
      expect(conditionExpr.contextRequiresSigner()).toBe(false);
      expect(conditionExpr.buildContext(provider, {}, signer)).toBeDefined();
      expect(conditionExpr.buildContext(provider, {})).toBeDefined();
    });

    it('rejects on a missing signer', () => {
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

    it('rejects on a missing signer', () => {
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
          customContractCondition,
        ).buildContext(provider, {}, signer);

        await expect(async () => conditionContext.toObj()).rejects.toThrow(
          `Missing custom context parameter(s): ${customParamKey}`,
        );
      });

      it('accepts on a hard-coded parameter', async () => {
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

      it.each([0, ''])(
        'accepts on a falsy parameter value: %s',
        async (falsyParam) => {
          const customParamKey = ':customParam';
          const customContractCondition = new ContractCondition({
            ...contractConditionObj,
            parameters: [USER_ADDRESS_PARAM, customParamKey],
          });
          const customParameters: Record<string, CustomContextParam> = {};
          customParameters[customParamKey] = falsyParam;
          const conditionContext = new ConditionExpression(
            customContractCondition,
          ).buildContext(provider, customParameters, signer);

          const asObj = await conditionContext.toObj();
          expect(asObj).toBeDefined();
          expect(asObj[USER_ADDRESS_PARAM]).toBeDefined();
          expect(asObj[customParamKey]).toBeDefined();
          expect(asObj[customParamKey]).toEqual(falsyParam);
        },
      );
    });
  });
});

describe('param or context param schema', () => {
  it('accepts a plain string', () => {
    expect(paramOrContextParamSchema.safeParse('hello').success).toBe(true);
  });

  it('accepts a context param', () => {
    expect(paramOrContextParamSchema.safeParse(':hello').success).toBe(true);
  });

  it('accepts an integer', () => {
    expect(paramOrContextParamSchema.safeParse(123).success).toBe(true);
  });

  it('accepts an floating number', () => {
    expect(paramOrContextParamSchema.safeParse(123.4).success).toBe(true);
  });

  it('accepts a hex string', () => {
    expect(paramOrContextParamSchema.safeParse("deadbeef").success).toBe(true);
  });

  it('accepts a 0x-prefixed hex string', () => {
    expect(paramOrContextParamSchema.safeParse("0xdeadbeef").success).toBe(true);
  });

  it('accepts a hex-encoded-bytes', () => {
    expect(paramOrContextParamSchema.safeParse(toHexString(new Uint8Array([1, 2, 3]))).success).toBe(true);
  });

  it('accepts a boolean', () => {
    expect(paramOrContextParamSchema.safeParse(true).success).toBe(true);
  });

  it('accepts an array', () => {
    expect(
      paramOrContextParamSchema.safeParse([1, 'hello', true]).success,
    ).toBe(true);
  });

  it('accepts nested arrays', () => {
    expect(
      paramOrContextParamSchema.safeParse([1, "hello", [123, 456, "hello", true]]).success,
    ).toBe(true);
  });

  it('accepts nested arrays', () => {
    expect(
      paramOrContextParamSchema.safeParse([1, "hello", [123, ":hello"]]).success,
    ).toBe(true);
  });

  it('rejects an object', () => {
    expect(paramOrContextParamSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a context param with illegal character', () => {
    const badString = ':hello#';
    expect(paramOrContextParamSchema.safeParse(badString).success).toBe(false);
  });

  it('rejects raw bytes', () => {
      expect(paramOrContextParamSchema.safeParse(new Uint8Array([1, 2, 3])).success).toBe(false);
  });
});
