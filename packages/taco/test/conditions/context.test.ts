import { initialize } from '@nucypher/nucypher-core';
import {
  AuthProviders,
  AuthSignature,
  EIP4361_AUTH_METHOD,
  EIP4361AuthProvider,
  USER_ADDRESS_PARAM_DEFAULT,
} from '@nucypher/taco-auth';
import {
  fakeAuthProviders,
  fakeProvider,
  fakeSigner,
} from '@nucypher/test-utils';
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
  USER_ADDRESS_PARAM_EXTERNAL_EIP4361,
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
  let authProviders: AuthProviders;

  beforeAll(async () => {
    await initialize();
    authProviders = fakeAuthProviders();
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
      ).buildContext({}, authProviders);
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

    describe('custom parameters', () => {
      it('serializes bytes as hex strings', async () => {
        const customParamsWithBytes: Record<string, CustomContextParam> = {};
        const customParam = toBytes('hello');
        // Uint8Array is not a valid CustomContextParam, override the type:
        customParamsWithBytes[customParamKey] =
          customParam as unknown as string;
        const contextAsJson = await conditionExpr
          .buildContext(customParamsWithBytes)
          .toJson();
        const asObj = JSON.parse(contextAsJson);
        expect(asObj).toBeDefined();
        expect(asObj[customParamKey]).toEqual(`0x${toHexString(customParam)}`);
      });

      it('detects when a custom parameter is requested', () => {
        const context = conditionExpr.buildContext({}, authProviders);
        expect(context.requestedParameters).toContain(customParamKey);
      });
    });

    describe('return value test', () => {
      it('accepts on a custom context parameters', async () => {
        const asObj = await conditionExpr
          .buildContext(customParams)
          .toContextParameters();
        expect(asObj).toBeDefined();
        expect(asObj[customParamKey]).toEqual(1234);
      });

      it('rejects on a missing custom context parameter', async () => {
        const context = conditionExpr.buildContext({}, authProviders);
        await expect(context.toContextParameters()).rejects.toThrow(
          `Missing custom context parameter(s): ${customParamKey}`,
        );
      });
    });

    it('rejects on using reserved context parameter', () => {
      RESERVED_CONTEXT_PARAMS.forEach((reservedParam) => {
        const badCustomParams: Record<string, CustomContextParam> = {};
        badCustomParams[reservedParam] = 'this-will-throw';
        expect(() => conditionExpr.buildContext(badCustomParams)).toThrow(
          `Cannot use reserved parameter name ${reservedParam} as custom parameter`,
        );
      });
    });

    it('rejects on using a custom parameter that was not requested', async () => {
      const badCustomParamKey = ':notRequested';
      const badCustomParams: Record<string, CustomContextParam> = {};
      badCustomParams[customParamKey] = 'this-is-fine';
      badCustomParams[badCustomParamKey] = 'this-will-throw';
      await expect(
        conditionExpr.buildContext(badCustomParams).toContextParameters(),
      ).rejects.toThrow(
        `Unknown custom context parameter(s): ${badCustomParamKey}`,
      );
    });

    it('detects when auth provider is required by parameters', () => {
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
      expect(conditionExpr.buildContext({}, authProviders)).toBeDefined();
      expect(() => conditionExpr.buildContext({})).toThrow(
        `No matching authentication provider to satisfy ${USER_ADDRESS_PARAM_DEFAULT} context variable in condition`,
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
      expect(conditionExpr.buildContext({}, authProviders)).toBeDefined();
      expect(() => conditionExpr.buildContext({})).toThrow(
        `No matching authentication provider to satisfy ${USER_ADDRESS_PARAM_DEFAULT} context variable in condition`,
      );
    });

    it('detects when signer is not required', () => {
      const condition = new RpcCondition(testRpcConditionObj);
      const conditionExpr = new ConditionExpression(condition);
      expect(
        JSON.stringify(condition.toObj()).includes(USER_ADDRESS_PARAM_DEFAULT),
      ).toBe(false);
      expect(conditionExpr.buildContext({}, authProviders)).toBeDefined();
      expect(conditionExpr.buildContext({})).toBeDefined();
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
      expect(() => conditionExpr.buildContext({}, undefined)).toThrow(
        `No matching authentication provider to satisfy ${USER_ADDRESS_PARAM_DEFAULT} context variable in condition`,
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
      expect(() => conditionExpr.buildContext({}, undefined)).toThrow(
        `No matching authentication provider to satisfy ${USER_ADDRESS_PARAM_DEFAULT} context variable in condition`,
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

      it('handles both custom and auth context parameters', () => {
        const requestedParams = new ConditionExpression(
          contractCondition,
        ).buildContext({}, authProviders).requestedParameters;
        expect(requestedParams).not.toContain(USER_ADDRESS_PARAM_DEFAULT);
        expect(requestedParams).toContain(customParamKey);
      });

      it('rejects on a missing parameter ', async () => {
        const customContractCondition = new ContractCondition({
          ...contractConditionObj,
          parameters: [USER_ADDRESS_PARAM_DEFAULT, customParamKey],
        });
        const conditionContext = new ConditionExpression(
          customContractCondition,
        ).buildContext({}, authProviders);

        await expect(async () =>
          conditionContext.toContextParameters(),
        ).rejects.toThrow(
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
        ).buildContext({}, authProviders);

        const asObj = await conditionContext.toContextParameters();
        expect(asObj).toBeDefined();
        expect(asObj[USER_ADDRESS_PARAM_DEFAULT]).toBeDefined();
      });

      it.each([0, ''])(
        'accepts on a falsy parameter value: %s',
        async (falsyParam) => {
          const customContractCondition = new ContractCondition({
            ...contractConditionObj,
            parameters: [USER_ADDRESS_PARAM_DEFAULT, customParamKey],
          });
          const customParameters: Record<string, CustomContextParam> = {};
          customParameters[customParamKey] = falsyParam;
          const conditionContext = new ConditionExpression(
            customContractCondition,
          ).buildContext(customParameters, authProviders);

          const asObj = await conditionContext.toContextParameters();
          expect(asObj).toBeDefined();
          expect(asObj[USER_ADDRESS_PARAM_DEFAULT]).toBeDefined();
          expect(asObj[customParamKey]).toBeDefined();
          expect(asObj[customParamKey]).toEqual(falsyParam);
        },
      );
    });
  });
});

// TODO: Move to a separate file
describe('No authentication provider', () => {
  let provider: ethers.providers.Provider;
  let signer: ethers.Signer;
  let authProviders: AuthProviders;

  async function testEIP4361AuthSignature(authSignature: AuthSignature) {
    expect(authSignature).toBeDefined();
    expect(authSignature.signature).toBeDefined();
    expect(authSignature.scheme).toEqual('EIP4361');

    const signerAddress = await signer.getAddress();
    expect(authSignature.address).toEqual(signerAddress);

    expect(authSignature.typedData).toContain(
      `localhost wants you to sign in with your Ethereum account:\n${signerAddress}`,
    );
    expect(authSignature.typedData).toContain('URI: http://localhost:3000');

    const chainId = (await provider.getNetwork()).chainId;
    expect(authSignature.typedData).toContain(`Chain ID: ${chainId}`);
  }

  beforeAll(async () => {
    await initialize();
    provider = fakeProvider();
    signer = fakeSigner();
    authProviders = fakeAuthProviders();
  });

  it('throws an error if there is no auth provider', () => {
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
      expect(() => conditionExpr.buildContext({}, {})).toThrow(
        `No matching authentication provider to satisfy ${userAddressParam} context variable in condition`,
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
    expect(() => conditionExpr.buildContext({}, authProviders)).not.toThrow();
  });

  async function makeAuthSignature(authMethod: string) {
    const conditionObj = {
      ...testContractConditionObj,
      returnValueTest: {
        ...testReturnValueTest,
        value: authMethod,
      },
    };
    const condition = new ContractCondition(conditionObj);
    const conditionExpr = new ConditionExpression(condition);

    const builtContext = conditionExpr.buildContext({}, authProviders);
    const contextVars = await builtContext.toContextParameters();
    const authSignature = contextVars[authMethod] as AuthSignature;
    expect(authSignature).toBeDefined();

    return authSignature;
  }

  async function testEIP4361AuthMethod(authMethod: string) {
    const eip4361Spy = vi.spyOn(
      EIP4361AuthProvider.prototype,
      'getOrCreateAuthSignature',
    );
    const authSignature = await makeAuthSignature(authMethod);
    await testEIP4361AuthSignature(authSignature);
    expect(eip4361Spy).toHaveBeenCalledOnce();
  }

  it('supports default auth method (eip4361)', async () => {
    await testEIP4361AuthMethod(USER_ADDRESS_PARAM_DEFAULT);
  });

  it('supports reusing external eip4361', async () => {
    // Because we are reusing an existing SIWE auth message, we have to pass it as a custom parameter
    const authMessage = await makeAuthSignature(USER_ADDRESS_PARAM_DEFAULT);
    const customParams: Record<string, CustomContextParam> = {
      [USER_ADDRESS_PARAM_EXTERNAL_EIP4361]: authMessage as CustomContextParam,
    };

    // Spying on the EIP4361 provider to make sure it's not called
    const eip4361Spy = vi.spyOn(
      EIP4361AuthProvider.prototype,
      'getOrCreateAuthSignature',
    );

    // Now, creating the condition context to run the actual test
    const conditionObj = {
      ...testContractConditionObj,
      returnValueTest: {
        ...testReturnValueTest,
        value: USER_ADDRESS_PARAM_EXTERNAL_EIP4361,
      },
    };
    const condition = new ContractCondition(conditionObj);
    const conditionExpr = new ConditionExpression(condition);

    // Make sure we remove the EIP4361 auth method from the auth providers first
    delete authProviders[EIP4361_AUTH_METHOD];
    // Should throw an error if we don't pass the custom parameter
    expect(() => conditionExpr.buildContext({}, authProviders)).toThrow(
      `No custom parameter for requested context parameter: ${USER_ADDRESS_PARAM_EXTERNAL_EIP4361}`,
    );

    // Remembering to pass in customParams here:
    const builtContext = conditionExpr.buildContext(
      customParams,
      authProviders,
    );
    const contextVars = await builtContext.toContextParameters();
    expect(eip4361Spy).not.toHaveBeenCalled();

    // Now, we expect that the auth signature will be available in the context variables
    const authSignature = contextVars[
      USER_ADDRESS_PARAM_EXTERNAL_EIP4361
    ] as AuthSignature;
    expect(authSignature).toBeDefined();
    await testEIP4361AuthSignature(authSignature);
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
