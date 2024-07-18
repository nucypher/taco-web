import { initialize } from '@nucypher/nucypher-core';
import {
  AuthProvider,
  AuthSignature,
  EIP4361AuthProvider,
  SingleSignOnEIP4361AuthProvider,
  USER_ADDRESS_PARAM_DEFAULT,
  USER_ADDRESS_PARAM_EXTERNAL_EIP4361,
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
import {
  ConditionContext,
  CustomContextParam,
} from '../../src/conditions/context';
import { RESERVED_CONTEXT_PARAMS } from '../../src/conditions/context/context';
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
  let authProviders: Record<string, AuthProvider>;
  beforeAll(async () => {
    await initialize();
    authProviders = await fakeAuthProviders();
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
      const conditionContext = new ConditionContext(rpcCondition);
      conditionContext.addAuthProvider(
        USER_ADDRESS_PARAM_DEFAULT,
        authProviders[USER_ADDRESS_PARAM_DEFAULT],
      );
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
    describe('custom parameters', () => {
      it('detects when a custom parameter is requested', () => {
        const conditionContext = new ConditionContext(contractCondition);
        expect(conditionContext.requestedParameters).toContain(customParamKey);
      });

      it('serializes bytes as hex strings', async () => {
        const customParamsWithBytes: Record<string, CustomContextParam> = {};
        const customParam = toBytes('hello');
        // Uint8Array is not a valid CustomContextParam, override the type:
        customParamsWithBytes[customParamKey] =
          customParam as unknown as string;

        const conditionContext = new ConditionContext(contractCondition);
        conditionContext.addCustomContextParameterValues(customParamsWithBytes);
        const contextAsJson = await conditionContext.toJson();
        const asObj = JSON.parse(contextAsJson);
        expect(asObj).toBeDefined();
        expect(asObj[customParamKey]).toEqual(`0x${toHexString(customParam)}`);
      });
    });

    describe('return value test', () => {
      it('accepts only custom context parameters', async () => {
        const conditionContext = new ConditionContext(contractCondition);
        conditionContext.addCustomContextParameterValues(customParams);
        const asObj = await conditionContext.toContextParameters();
        expect(asObj).toBeDefined();
        expect(asObj[customParamKey]).toEqual(1234);
      });

      it('rejects on a missing custom context parameter', async () => {
        const conditionContext = new ConditionContext(contractCondition);
        conditionContext.addAuthProvider(
          USER_ADDRESS_PARAM_DEFAULT,
          authProviders[USER_ADDRESS_PARAM_DEFAULT],
        );
        await expect(conditionContext.toContextParameters()).rejects.toThrow(
          `Missing custom context parameter(s): ${customParamKey}`,
        );
      });
    });

    it('rejects on using reserved context parameter', () => {
      const conditionContext = new ConditionContext(contractCondition);
      RESERVED_CONTEXT_PARAMS.forEach((reservedParam) => {
        const badCustomParams: Record<string, CustomContextParam> = {};
        badCustomParams[reservedParam] = 'this-will-throw';
        expect(() =>
          conditionContext.addCustomContextParameterValues(badCustomParams),
        ).toThrow(
          `Cannot use reserved parameter name ${reservedParam} as custom parameter`,
        );
      });
    });

    it('rejects on using a custom parameter that was not requested', () => {
      const badCustomParamKey = ':notRequested';
      const badCustomParams: Record<string, CustomContextParam> = {};
      badCustomParams[customParamKey] = 'this-is-fine';
      badCustomParams[badCustomParamKey] = 'this-will-throw';
      const conditionContext = new ConditionContext(contractCondition);
      expect(() =>
        conditionContext.addCustomContextParameterValues(badCustomParams),
      ).toThrow(`Unknown custom context parameter: ${badCustomParamKey}`);
    });

    it('detects when auth provider is required by parameters', async () => {
      const conditionObj = {
        ...testContractConditionObj,
        parameters: [USER_ADDRESS_PARAM_DEFAULT],
        returnValueTest: {
          comparator: '==',
          value: 100,
        } as ReturnValueTestProps,
      };
      const condition = new ContractCondition(conditionObj);
      const conditionContext = new ConditionContext(condition);
      await expect(conditionContext.toContextParameters()).rejects.toThrow(
        `No matching authentication provider to satisfy ${USER_ADDRESS_PARAM_DEFAULT} context variable in condition`,
      );
    });

    it('detects when signer is required by return value test', async () => {
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
      const conditionContext = new ConditionContext(condition);
      await expect(conditionContext.toContextParameters()).rejects.toThrow(
        `No matching authentication provider to satisfy ${USER_ADDRESS_PARAM_DEFAULT} context variable in condition`,
      );
    });

    it('detects when signer is not required', async () => {
      const condition = new RpcCondition(testRpcConditionObj);
      const conditionContext = new ConditionContext(condition);
      expect(
        JSON.stringify(condition.toObj()).includes(USER_ADDRESS_PARAM_DEFAULT),
      ).toBe(false);
      await expect(conditionContext.toContextParameters()).toBeDefined();
    });

    it('rejects on a missing signer', async () => {
      const conditionObj = {
        ...testContractConditionObj,
        returnValueTest: {
          ...testReturnValueTest,
          value: USER_ADDRESS_PARAM_DEFAULT,
        },
      };
      const condition = new ContractCondition(conditionObj);
      const conditionContext = new ConditionContext(condition);
      await expect(conditionContext.toContextParameters()).rejects.toThrow(
        `No matching authentication provider to satisfy ${USER_ADDRESS_PARAM_DEFAULT} context variable in condition`,
      );
    });

    it('rejects on a missing signer for single sign-on EIP4361', async () => {
      const conditionObj = {
        ...testContractConditionObj,
        returnValueTest: {
          ...testReturnValueTest,
          value: USER_ADDRESS_PARAM_EXTERNAL_EIP4361,
        },
      };
      const condition = new ContractCondition(conditionObj);
      const conditionContext = new ConditionContext(condition);
      await expect(conditionContext.toContextParameters()).rejects.toThrow(
        `No matching authentication provider to satisfy ${USER_ADDRESS_PARAM_EXTERNAL_EIP4361} context variable in condition`,
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
        const requestedParams = new ConditionContext(contractCondition)
          .requestedParameters;
        expect(requestedParams).not.toContain(USER_ADDRESS_PARAM_DEFAULT);
        expect(requestedParams).toContain(customParamKey);
      });

      it('rejects on a missing custom parameter ', async () => {
        const customContractCondition = new ContractCondition({
          ...contractConditionObj,
          parameters: [USER_ADDRESS_PARAM_DEFAULT, customParamKey],
        });
        const conditionContext = new ConditionContext(customContractCondition);
        conditionContext.addAuthProvider(
          USER_ADDRESS_PARAM_DEFAULT,
          authProviders[USER_ADDRESS_PARAM_DEFAULT],
        );

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
        const conditionContext = new ConditionContext(customContractCondition);
        conditionContext.addAuthProvider(
          USER_ADDRESS_PARAM_DEFAULT,
          authProviders[USER_ADDRESS_PARAM_DEFAULT],
        );

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

          const conditionContext = new ConditionContext(
            customContractCondition,
          );
          conditionContext.addAuthProvider(
            USER_ADDRESS_PARAM_DEFAULT,
            authProviders[USER_ADDRESS_PARAM_DEFAULT],
          );
          conditionContext.addCustomContextParameterValues(customParameters);

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
  let authProviders: Record<string, AuthProvider>;

  async function testEIP4361AuthSignature(
    authSignature: AuthSignature,
    expectedAddress?: string,
  ) {
    expect(authSignature).toBeDefined();
    expect(authSignature.signature).toBeDefined();
    expect(authSignature.scheme).toEqual('EIP4361');

    const addressToUse = expectedAddress
      ? expectedAddress
      : await signer.getAddress();
    expect(authSignature.address).toEqual(addressToUse);

    expect(authSignature.typedData).toContain(
      `localhost wants you to sign in with your Ethereum account:\n${addressToUse}`,
    );
    expect(authSignature.typedData).toContain('URI: http://localhost:3000');

    const chainId = (await provider.getNetwork()).chainId;
    expect(authSignature.typedData).toContain(`Chain ID: ${chainId}`);
  }

  beforeAll(async () => {
    await initialize();
    provider = fakeProvider();
    signer = fakeSigner();
    authProviders = await fakeAuthProviders();
  });

  it('throws an error if there is no auth provider', () => {
    RESERVED_CONTEXT_PARAMS.forEach(async (userAddressParam) => {
      const conditionObj = {
        ...testContractConditionObj,
        returnValueTest: {
          ...testReturnValueTest,
          value: userAddressParam,
        },
      };
      const condition = new ContractCondition(conditionObj);
      const conditionContext = new ConditionContext(condition);
      await expect(conditionContext.toContextParameters()).rejects.toThrow(
        `No matching authentication provider to satisfy ${userAddressParam} context variable in condition`,
      );
    });
  });

  it('it supports just one provider at a time', async () => {
    const conditionObj = {
      ...testContractConditionObj,
      returnValueTest: {
        ...testReturnValueTest,
        value: USER_ADDRESS_PARAM_DEFAULT,
      },
    };
    const condition = new ContractCondition(conditionObj);
    const conditionContext = new ConditionContext(condition);
    conditionContext.addAuthProvider(
      USER_ADDRESS_PARAM_DEFAULT,
      authProviders[USER_ADDRESS_PARAM_DEFAULT],
    );
    expect(async () => conditionContext.toContextParameters()).not.toThrow();
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

    const conditionContext = new ConditionContext(condition);
    conditionContext.addAuthProvider(
      USER_ADDRESS_PARAM_DEFAULT,
      authProviders[USER_ADDRESS_PARAM_DEFAULT],
    );
    const contextVars = await conditionContext.toContextParameters();
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
    const conditionContext = new ConditionContext(condition);

    // Should throw an error if we don't pass the custom parameter
    await expect(conditionContext.toContextParameters()).rejects.toThrow(
      `No matching authentication provider to satisfy ${USER_ADDRESS_PARAM_EXTERNAL_EIP4361} context variable in condition`,
    );

    // Remembering to pass in auth provider
    conditionContext.addAuthProvider(
      USER_ADDRESS_PARAM_EXTERNAL_EIP4361,
      authProviders[USER_ADDRESS_PARAM_EXTERNAL_EIP4361],
    );
    const contextVars = await conditionContext.toContextParameters();
    expect(eip4361Spy).not.toHaveBeenCalled();

    // Now, we expect that the auth signature will be available in the context variables
    const authSignature = contextVars[
      USER_ADDRESS_PARAM_EXTERNAL_EIP4361
    ] as AuthSignature;
    expect(authSignature).toBeDefined();
    await testEIP4361AuthSignature(
      authSignature,
      (
        authProviders[
          USER_ADDRESS_PARAM_EXTERNAL_EIP4361
        ] as SingleSignOnEIP4361AuthProvider
      ).address,
    );
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
