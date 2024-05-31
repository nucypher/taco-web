import { initialize } from '@nucypher/nucypher-core';
import {
  EIP4361SignatureProvider,
  EIP712SignatureProvider,
} from '@nucypher/taco-auth';
import { fakeProvider, fakeSigner } from '@nucypher/test-utils';
import { ethers } from 'ethers';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { toBytes, toHexString } from '../../src';
import {
  ContractCondition,
  ContractConditionProps,
} from '../../src/conditions/base/contract';
import { RpcCondition } from '../../src/conditions/base/rpc';
import { ConditionExpression } from '../../src/conditions/condition-expr';
import {
  RESERVED_CONTEXT_PARAMS,
  USER_ADDRESS_PARAM_DEFAULT,
  USER_ADDRESS_PARAM_EIP4361,
  USER_ADDRESS_PARAM_EIP712,
} from '../../src/conditions/const';
import { CustomContextParam } from '../../src/conditions/context';
import {
  paramOrContextParamSchema,
  ReturnValueTestProps,
} from '../../src/conditions/shared';
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
        parameters: [USER_ADDRESS_PARAM_DEFAULT],
        returnValueTest: {
          comparator: '==',
          value: USER_ADDRESS_PARAM_DEFAULT,
        },
      });
      const conditionContext = new ConditionExpression(
        rpcCondition,
      ).buildContext(provider, {}, signer);
      const asJson = await conditionContext.toJson();

      expect(asJson).toBeDefined();
      expect(asJson).toContain(USER_ADDRESS_PARAM_DEFAULT);
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
      RESERVED_CONTEXT_PARAMS.forEach((reservedParam) => {
        const badCustomParams: Record<string, CustomContextParam> = {};
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

    it('detects when signer is required by parameters', () => {
      const conditionObj = {
        ...testContractConditionObj,
        parameters: [USER_ADDRESS_PARAM_DEFAULT],
        returnValueTest: {
          comparator: '==',
          value: 100,
        } as ReturnValueTestProps,
      };
      const condition = new ContractCondition(conditionObj);
      const conditionExpr = new ConditionExpression(condition);
      expect(conditionExpr.contextRequiresSigner()).toBe(true);
      expect(conditionExpr.buildContext(provider, {}, signer)).toBeDefined();
      expect(() => conditionExpr.buildContext(provider, {})).toThrow(
        `Signer required to satisfy ${USER_ADDRESS_PARAM_DEFAULT} context variable in condition`,
      );
    });

    it('detects when signer is required by return value test', () => {
      const conditionObj = {
        ...testContractConditionObj,
        standardContractType: 'ERC721',
        method: 'ownerOf',
        parameters: [3591],
        returnValueTest: {
          comparator: '==',
          value: USER_ADDRESS_PARAM_DEFAULT,
        },
      } as ContractConditionProps;
      const condition = new ContractCondition(conditionObj);
      const conditionExpr = new ConditionExpression(condition);
      expect(conditionExpr.contextRequiresSigner()).toBe(true);
      expect(conditionExpr.buildContext(provider, {}, signer)).toBeDefined();
      expect(() => conditionExpr.buildContext(provider, {})).toThrow(
        `Signer required to satisfy ${USER_ADDRESS_PARAM_DEFAULT} context variable in condition`,
      );
    });

    it('detects when signer is not required', () => {
      const condition = new RpcCondition(testRpcConditionObj);
      const conditionExpr = new ConditionExpression(condition);
      expect(
        JSON.stringify(condition.toObj()).includes(USER_ADDRESS_PARAM_DEFAULT),
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
          value: USER_ADDRESS_PARAM_DEFAULT,
        },
      };
      const condition = new ContractCondition(conditionObj);
      const conditionExpr = new ConditionExpression(condition);
      expect(conditionExpr.contextRequiresSigner()).toBe(true);
      expect(() => conditionExpr.buildContext(provider, {}, undefined)).toThrow(
        `Signer required to satisfy ${USER_ADDRESS_PARAM_DEFAULT} context variable in condition`,
      );
    });

    it('rejects on a missing signer', () => {
      const conditionObj = {
        ...testContractConditionObj,
        returnValueTest: {
          ...testReturnValueTest,
          value: USER_ADDRESS_PARAM_DEFAULT,
        },
      };
      const condition = new ContractCondition(conditionObj);
      const conditionExpr = new ConditionExpression(condition);
      expect(conditionExpr.contextRequiresSigner()).toBe(true);
      expect(() => conditionExpr.buildContext(provider, {}, undefined)).toThrow(
        `Signer required to satisfy ${USER_ADDRESS_PARAM_DEFAULT} context variable in condition`,
      );
    });

    describe('custom method parameters', () => {
      const contractConditionObj = {
        ...testContractConditionObj,
        standardContractType: undefined, // We're going to use a custom function ABI
        functionAbi: testFunctionAbi,
        method: testFunctionAbi.name,
        parameters: [USER_ADDRESS_PARAM_DEFAULT, customParamKey], // We're going to use a custom parameter
        returnValueTest: {
          ...testReturnValueTest,
        },
      };

      it('rejects on a missing parameter ', async () => {
        const customContractCondition = new ContractCondition({
          ...contractConditionObj,
          parameters: [USER_ADDRESS_PARAM_DEFAULT, customParamKey],
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
          parameters: [USER_ADDRESS_PARAM_DEFAULT, 100],
        });
        const conditionContext = new ConditionExpression(
          customContractCondition,
        ).buildContext(provider, {}, signer);

        const asObj = await conditionContext.toObj();
        expect(asObj).toBeDefined();
        expect(asObj[USER_ADDRESS_PARAM_DEFAULT]).toBeDefined();
      });

      it.each([0, ''])(
        'accepts on a falsy parameter value: %s',
        async (falsyParam) => {
          const customParamKey = ':customParam';
          const customContractCondition = new ContractCondition({
            ...contractConditionObj,
            parameters: [USER_ADDRESS_PARAM_DEFAULT, customParamKey],
          });
          const customParameters: Record<string, CustomContextParam> = {};
          customParameters[customParamKey] = falsyParam;
          const conditionContext = new ConditionExpression(
            customContractCondition,
          ).buildContext(provider, customParameters, signer);

          const asObj = await conditionContext.toObj();
          expect(asObj).toBeDefined();
          expect(asObj[USER_ADDRESS_PARAM_DEFAULT]).toBeDefined();
          expect(asObj[customParamKey]).toBeDefined();
          expect(asObj[customParamKey]).toEqual(falsyParam);
        },
      );
    });
  });
});

describe('authentication provider', () => {
  let provider: ethers.providers.Provider;
  let signer: ethers.Signer;

  beforeAll(async () => {
    await initialize();
    provider = fakeProvider();
    signer = fakeSigner();
  });

  it('throws an error if there is no signer', () => {
    RESERVED_CONTEXT_PARAMS.forEach((userAddressParam) => {
      const conditionObj = {
        ...testContractConditionObj,
        returnValueTest: {
          ...testReturnValueTest,
          value: userAddressParam,
        },
      };
      const condition = new ContractCondition(conditionObj);
      const conditionExpr = new ConditionExpression(condition);
      expect(conditionExpr.contextRequiresSigner()).toBe(true);
      expect(() => conditionExpr.buildContext(provider, {}, undefined)).toThrow(
        `Signer required to satisfy ${userAddressParam} context variable in condition`,
      );
    });
  });

  it('it supports just one provider at a time', () => {
    const conditionObj = {
      ...testContractConditionObj,
      returnValueTest: {
        ...testReturnValueTest,
        value: USER_ADDRESS_PARAM_DEFAULT,
      },
    };
    const condition = new ContractCondition(conditionObj);
    const conditionExpr = new ConditionExpression(condition);
    expect(conditionExpr.contextRequiresSigner()).toBe(true);
    expect(() =>
      conditionExpr.buildContext(provider, {}, signer),
    ).not.toThrow();
  });

  it('supports multiple providers when needed', () => {
    const conditionObj = {
      ...testContractConditionObj,
      returnValueTest: {
        ...testReturnValueTest,
        // TODO: Is it supposed to work? Multiple providers at the same time?
        value: [USER_ADDRESS_PARAM_EIP712, USER_ADDRESS_PARAM_EIP4361],
      },
    };
    const condition = new ContractCondition(conditionObj);
    const conditionExpr = new ConditionExpression(condition);
    expect(conditionExpr.contextRequiresSigner()).toBe(true);
    expect(() =>
      conditionExpr.buildContext(provider, {}, signer),
    ).not.toThrow();
  });

  // TODO: Consider rewriting those tests to be a bit more comprehensive and deduplicate them

  it('supports default auth method (eip712)', async () => {
    const eip712Spy = vi.spyOn(
      EIP712SignatureProvider.prototype,
      'getOrCreateWalletSignature',
    );
    const conditionObj = {
      ...testContractConditionObj,
      returnValueTest: {
        ...testReturnValueTest,
        value: USER_ADDRESS_PARAM_DEFAULT,
      },
    };
    const condition = new ContractCondition(conditionObj);
    const conditionExpr = new ConditionExpression(condition);
    expect(conditionExpr.contextRequiresSigner()).toBe(true);
    const builtContext = conditionExpr.buildContext(provider, {}, signer);

    const resolvedContextRecords = await builtContext.toObj();

    const typeSignature = resolvedContextRecords[USER_ADDRESS_PARAM_DEFAULT];
    expect(typeSignature).toBeDefined();
    expect(typeSignature.signature).toBeDefined();
    expect(typeSignature.scheme).toEqual('EIP712');
    expect(typeSignature.address).toEqual(await signer.getAddress());
    expect(typeSignature.typedData.domain.name).toEqual('TACo');
    expect(typeSignature.typedData.message.address).toEqual(
      await signer.getAddress(),
    );
    expect(eip712Spy).toHaveBeenCalledOnce();
  });

  it('supports eip712', async () => {
    const eip712Spy = vi.spyOn(
      EIP712SignatureProvider.prototype,
      'getOrCreateWalletSignature',
    );
    const conditionObj = {
      ...testContractConditionObj,
      returnValueTest: {
        ...testReturnValueTest,
        value: USER_ADDRESS_PARAM_EIP712,
      },
    };
    const condition = new ContractCondition(conditionObj);
    const conditionExpr = new ConditionExpression(condition);
    expect(conditionExpr.contextRequiresSigner()).toBe(true);

    const builtContext = conditionExpr.buildContext(provider, {}, signer);
    const resolvedContextRecords = await builtContext.toObj();

    const typeSignature = resolvedContextRecords[USER_ADDRESS_PARAM_EIP712];
    expect(typeSignature).toBeDefined();
    expect(typeSignature.signature).toBeDefined();
    expect(typeSignature.scheme).toEqual('EIP712');
    expect(typeSignature.address).toEqual(await signer.getAddress());
    expect(typeSignature.typedData.domain.name).toEqual('TACo');
    expect(typeSignature.typedData.message.address).toEqual(
      await signer.getAddress(),
    );
    expect(eip712Spy).toHaveBeenCalledOnce();
  });

  it('supports eip4361', async () => {
    const eip4361Spy = vi.spyOn(
      EIP4361SignatureProvider.prototype,
      'getOrCreateSiweMessage',
    );
    const conditionObj = {
      ...testContractConditionObj,
      returnValueTest: {
        ...testReturnValueTest,
        value: USER_ADDRESS_PARAM_EIP4361,
      },
    };
    const condition = new ContractCondition(conditionObj);
    const conditionExpr = new ConditionExpression(condition);
    expect(conditionExpr.contextRequiresSigner()).toBe(true);

    const builtContext = conditionExpr.buildContext(provider, {}, signer);
    const resolvedContextRecords = await builtContext.toObj();

    const typeSignature = resolvedContextRecords[USER_ADDRESS_PARAM_EIP4361];
    expect(typeSignature).toBeDefined();
    expect(typeSignature.signature).toBeDefined();
    expect(typeSignature.scheme).toEqual('EIP4361');

    const signerAddress = await signer.getAddress();
    expect(typeSignature.address).toEqual(signerAddress);

    expect(typeSignature.typedData).toContain(
      `TACo wants you to sign in with your Ethereum account:\n${signerAddress}`,
    );
    expect(typeSignature.typedData).toContain('URI: https://TACo');

    const chainId = (await provider.getNetwork()).chainId;
    expect(typeSignature.typedData).toContain(`Chain ID: ${chainId}`);

    expect(eip4361Spy).toHaveBeenCalledOnce();
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

  it('accepts a string', () => {
    expect(paramOrContextParamSchema.safeParse('deadbeef').success).toBe(true);
  });

  it('accepts a 0x-prefixed hex string', () => {
    expect(paramOrContextParamSchema.safeParse('0xdeadbeef').success).toBe(
      true,
    );
  });

  it('accepts a hex-encoded-bytes', () => {
    expect(
      paramOrContextParamSchema.safeParse(
        toHexString(new Uint8Array([1, 2, 3])),
      ).success,
    ).toBe(true);
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
      paramOrContextParamSchema.safeParse([
        1,
        'hello',
        [123, 456, 'hello', true],
      ]).success,
    ).toBe(true);
  });

  it('accepts nested arrays', () => {
    expect(
      paramOrContextParamSchema.safeParse([1, 'hello', [123, ':hello']])
        .success,
    ).toBe(true);

    expect(
      paramOrContextParamSchema.safeParse([
        1,
        [
          2,
          [true, [1.23, ':hi', '0xdeadbeef'], ':my_name_is', 1],
          ':slim_shady',
          false,
        ],
      ]).success,
    ).toBe(true);
  });

  it('rejects a nested array with a bad context variable', () => {
    expect(
      paramOrContextParamSchema.safeParse([1, 'hello', [123, ':1234']]).success,
    ).toBe(false);
  });

  it('rejects an object', () => {
    expect(paramOrContextParamSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a context param with illegal character', () => {
    const badString = ':hello#';
    expect(paramOrContextParamSchema.safeParse(badString).success).toBe(false);
  });

  it('rejects raw bytes', () => {
    expect(
      paramOrContextParamSchema.safeParse(new Uint8Array([1, 2, 3])).success,
    ).toBe(false);
  });

  it('rejects a null value', () => {
    expect(paramOrContextParamSchema.safeParse(null).success).toBe(false);
  });

  it('rejects an undefined value', () => {
    expect(paramOrContextParamSchema.safeParse(undefined).success).toBe(false);
  });

  it('rejects a date object', () => {
    expect(paramOrContextParamSchema.safeParse(new Date()).success).toBe(false);
  });

  it('rejects a function', () => {
    expect(paramOrContextParamSchema.safeParse(() => {}).success).toBe(false);
  });
});
