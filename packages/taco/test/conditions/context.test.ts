import { initialize } from '@nucypher/nucypher-core';
import {
  AuthProvider,
  AuthSignature,
  EIP1271AuthProvider,
  EIP1271AuthSignature,
  EIP4361AuthProvider,
  SingleSignOnEIP4361AuthProvider,
  USER_ADDRESS_PARAM_DEFAULT,
} from '@nucypher/taco-auth';
import {
  EIP1271,
  EIP4361,
  fakeAuthProviders,
  fakeProvider,
  SSO_EIP4361,
} from '@nucypher/test-utils';
import { ethers } from 'ethers';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { toBytes, toHexString } from '../../src';
import { ConditionFactory } from '../../src/conditions';
import {
  ContractCondition,
  ContractConditionProps,
  ContractConditionType,
} from '../../src/conditions/base/contract';
import { RpcCondition } from '../../src/conditions/base/rpc';
import { CompoundConditionType } from '../../src/conditions/compound-condition';
import {
  ConditionContext,
  CustomContextParam,
} from '../../src/conditions/context';
import { RESERVED_CONTEXT_PARAMS } from '../../src/conditions/context/context';
import { IfThenElseConditionType } from '../../src/conditions/if-then-else-condition';
import { SequentialConditionType } from '../../src/conditions/sequential';
import {
  paramOrContextParamSchema,
  ReturnValueTestProps,
} from '../../src/conditions/shared';
import {
  testContractConditionObj,
  testFunctionAbi,
  testJsonApiConditionObj,
  testJsonRpcConditionObj,
  testReturnValueTest,
  testRpcConditionObj,
  testTimeConditionObj,
} from '../test-utils';

describe('context', () => {
  let authProviders: Record<string, AuthProvider>;
  beforeAll(async () => {
    await initialize();
    authProviders = await fakeAuthProviders();
  });

  describe('reserved context parameters', () => {
    it.each([
      [USER_ADDRESS_PARAM_DEFAULT, 'EIP4361'],
      [USER_ADDRESS_PARAM_DEFAULT, 'SSO4361'],
    ])('serializes to json', async (userAddressParam, scheme) => {
      const rpcCondition = new RpcCondition({
        ...testRpcConditionObj,
        parameters: [userAddressParam],
        returnValueTest: {
          comparator: '==',
          value: userAddressParam,
        },
      });
      const conditionContext = new ConditionContext(rpcCondition);
      conditionContext.addAuthProvider(userAddressParam, authProviders[scheme]);
      const asJson = await conditionContext.toJson();

      expect(asJson).toBeDefined();
      expect(asJson).toContain(userAddressParam);
    });

    it.each([USER_ADDRESS_PARAM_DEFAULT])(
      'detects when auth provider is required by parameters',
      async (userAddressParam) => {
        const conditionObj = {
          ...testContractConditionObj,
          parameters: [userAddressParam],
          returnValueTest: {
            comparator: '==',
            value: 100,
          } as ReturnValueTestProps,
        };
        const condition = new ContractCondition(conditionObj);
        const conditionContext = new ConditionContext(condition);
        await expect(conditionContext.toContextParameters()).rejects.toThrow(
          `No matching authentication provider to satisfy ${userAddressParam} context variable in condition`,
        );
      },
    );

    it.each([USER_ADDRESS_PARAM_DEFAULT])(
      'detects when signer is required by return value test',
      async (userAddressParam) => {
        const conditionObj = {
          ...testContractConditionObj,
          standardContractType: 'ERC721',
          method: 'ownerOf',
          parameters: [3591],
          returnValueTest: {
            comparator: '==',
            value: userAddressParam,
          },
        } as ContractConditionProps;
        const condition = new ContractCondition(conditionObj);
        const conditionContext = new ConditionContext(condition);
        await expect(conditionContext.toContextParameters()).rejects.toThrow(
          `No matching authentication provider to satisfy ${userAddressParam} context variable in condition`,
        );
      },
    );

    it('detects when signer is not required', async () => {
      const condition = new RpcCondition(testRpcConditionObj);
      const conditionContext = new ConditionContext(condition);
      expect(
        JSON.stringify(condition.toObj()).includes(USER_ADDRESS_PARAM_DEFAULT),
      ).toBe(false);
      await expect(conditionContext.toContextParameters()).toBeDefined();
    });

    it.each([USER_ADDRESS_PARAM_DEFAULT])(
      'return value test rejects on a missing signer',
      async (userAddressParam) => {
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
      },
    );

    it('rejects auth provider for not applicable context param', () => {
      const conditionObj = {
        ...testContractConditionObj,
        returnValueTest: {
          ...testReturnValueTest,
          value: ':myParam',
        },
      };
      const condition = new ContractCondition(conditionObj);
      const conditionContext = new ConditionContext(condition);
      expect(() =>
        conditionContext.addAuthProvider(':myParam', authProviders['EIP4361']),
      ).toThrow('AuthProvider not necessary for context parameter: :myParam');
    });

    it('rejects invalid auth provider for :userAddress', () => {
      const conditionObj = {
        ...testContractConditionObj,
        returnValueTest: {
          ...testReturnValueTest,
          value: USER_ADDRESS_PARAM_DEFAULT,
        },
      };
      const condition = new ContractCondition(conditionObj);
      const conditionContext = new ConditionContext(condition);
      expect(() =>
        conditionContext.addAuthProvider(
          USER_ADDRESS_PARAM_DEFAULT,
          authProviders['Bogus'],
        ),
      ).toThrow(`Invalid AuthProvider type for ${USER_ADDRESS_PARAM_DEFAULT}`);
    });

    it.each([
      [USER_ADDRESS_PARAM_DEFAULT, EIP4361],
      [USER_ADDRESS_PARAM_DEFAULT, SSO_EIP4361],
      [USER_ADDRESS_PARAM_DEFAULT, EIP1271],
    ])(
      'it supports just one provider at a time',
      async (userAddressParam, scheme) => {
        const conditionObj = {
          ...testContractConditionObj,
          returnValueTest: {
            ...testReturnValueTest,
            value: userAddressParam,
          },
        };
        const condition = new ContractCondition(conditionObj);
        const conditionContext = new ConditionContext(condition);
        conditionContext.addAuthProvider(
          userAddressParam,
          authProviders[scheme],
        );
        expect(async () =>
          conditionContext.toContextParameters(),
        ).not.toThrow();
      },
    );
  });

  describe('authentication signature', () => {
    let provider: ethers.providers.Web3Provider;
    let signer: ethers.providers.JsonRpcSigner;
    let authProviders: Record<string, AuthProvider>;

    beforeAll(async () => {
      await initialize();
      provider = fakeProvider();
      signer = provider.getSigner();
      authProviders = await fakeAuthProviders(signer);
    });

    async function testAuthSignature(
      authSignature: AuthSignature,
      expectedScheme: string,
      expectedAddress?: string,
    ) {
      expect(authSignature).toBeDefined();
      expect(authSignature.signature).toBeDefined();
      expect(authSignature.scheme).toEqual(expectedScheme);

      const addressToUse = expectedAddress
        ? expectedAddress
        : await signer.getAddress();
      expect(authSignature.address).toEqual(addressToUse);

      const chainId = (await provider.getNetwork()).chainId;

      if (expectedScheme === 'EIP4361') {
        expect(authSignature.typedData).toContain(
          `localhost wants you to sign in with your Ethereum account:\n${addressToUse}`,
        );
        expect(authSignature.typedData).toContain('URI: http://localhost:3000');

        expect(authSignature.typedData).toContain(`Chain ID: ${chainId}`);
      } else if (expectedScheme === 'EIP1271') {
        const authSign = authSignature as EIP1271AuthSignature;
        expect(authSign.typedData.chain).toEqual(chainId);
        expect(authSign.typedData.dataHash).toBeDefined();
      } else {
        throw new Error(`Unknown scheme: ${expectedScheme}`);
      }
    }

    async function makeAuthSignature(
      userAddressParam: string,
      scheme: typeof EIP4361 | typeof SSO_EIP4361 | typeof EIP1271,
    ) {
      const conditionObj = {
        ...testContractConditionObj,
        returnValueTest: {
          ...testReturnValueTest,
          value: userAddressParam,
        },
      };
      const condition = new ContractCondition(conditionObj);

      const conditionContext = new ConditionContext(condition);
      conditionContext.addAuthProvider(userAddressParam, authProviders[scheme]);
      const contextVars = await conditionContext.toContextParameters();
      const authSignature = contextVars[userAddressParam] as AuthSignature;
      expect(authSignature).toBeDefined();

      return authSignature;
    }

    it('supports default auth method (eip4361)', async () => {
      const eip4361Spy = vi.spyOn(
        EIP4361AuthProvider.prototype,
        'getOrCreateAuthSignature',
      );

      const authSignature = await makeAuthSignature(
        USER_ADDRESS_PARAM_DEFAULT,
        'EIP4361',
      );
      await testAuthSignature(authSignature, 'EIP4361');
      expect(eip4361Spy).toHaveBeenCalledOnce();
    });

    it('supports reusing external eip4361', async () => {
      // Spying on the EIP4361 provider to make sure it's not called
      const eip4361Spy = vi.spyOn(
        SingleSignOnEIP4361AuthProvider.prototype,
        'getOrCreateAuthSignature',
      );

      const authSignature = await makeAuthSignature(
        USER_ADDRESS_PARAM_DEFAULT,
        'SSO4361',
      );
      expect(authSignature).toBeDefined();
      await testAuthSignature(
        authSignature,
        'EIP4361',
        (authProviders['SSO4361'] as SingleSignOnEIP4361AuthProvider).address,
      );
      expect(eip4361Spy).toHaveBeenCalledOnce();
    });

    it('supports eip1271 auth method', async () => {
      const eip1271Spy = vi.spyOn(
        EIP1271AuthProvider.prototype,
        'getOrCreateAuthSignature',
      );

      const authSignature = await makeAuthSignature(
        USER_ADDRESS_PARAM_DEFAULT,
        'EIP1271',
      );
      expect(authSignature).toBeDefined();
      await testAuthSignature(
        authSignature,
        'EIP1271',
        (authProviders['EIP1271'] as EIP1271AuthProvider).contractAddress,
      );
      expect(eip1271Spy).toHaveBeenCalledOnce();
    });
  });

  describe('user-defined context parameters', () => {
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
        expect(conditionContext.requestedContextParameters).toContain(
          customParamKey,
        );
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
          authProviders[EIP4361],
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
        const requestedContextParams = new ConditionContext(contractCondition)
          .requestedContextParameters;
        expect(requestedContextParams).not.toContain(
          USER_ADDRESS_PARAM_DEFAULT,
        );
        expect(requestedContextParams).toContain(customParamKey);
      });

      it('rejects on a missing custom parameter ', async () => {
        const customContractCondition = new ContractCondition({
          ...contractConditionObj,
          parameters: [USER_ADDRESS_PARAM_DEFAULT, customParamKey],
        });
        const conditionContext = new ConditionContext(customContractCondition);
        conditionContext.addAuthProvider(
          USER_ADDRESS_PARAM_DEFAULT,
          authProviders[EIP4361],
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
          authProviders[EIP4361],
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
            authProviders[EIP4361],
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

describe('recognition of context variables in conditions', () => {
  const rvt = {
    comparator: '>=',
    value: ':expectedResult',
  };

  const rpcCondition = {
    ...testRpcConditionObj,
    parameters: [':userAddress', ':blockNumber'],
    returnValueTest: rvt,
  };

  const timeCondition = {
    ...testTimeConditionObj,
    returnValueTest: rvt,
  };

  const contractCondition = {
    conditionType: ContractConditionType,
    contractAddress: '0x0000000000000000000000000000000000000000',
    chain: 1,
    method: 'balanceOf',
    functionAbi: testFunctionAbi,
    parameters: [':userAddress'],
    returnValueTest: rvt,
  };

  const jsonApiCondition = {
    ...testJsonApiConditionObj,
    endpoint: 'https://api.example.com/:userId/:endpoint',
    parameters: {
      value1: ':value1',
      value2: 2,
    },
    query: '$.data[?(@.owner == :query)].value',
    authorizationToken: ':authToken',
    returnValueTest: rvt,
  };

  const jsonRpcConditionParamsDict = {
    ...testJsonRpcConditionObj,
    endpoint: 'https://math.example.com/:version/simple',
    method: 'subtract',
    params: {
      value1: 42,
      value2: ':value2',
    },
    query: '$.:queryKey',
    authorizationToken: ':authToken',
    returnValueTest: rvt,
  };

  const jsonRpcConditionParamsArray = {
    ...testJsonRpcConditionObj,
    endpoint: 'https://math.example.com/:version/simple',
    method: 'subtract',
    params: [':value1', ':value2'],
    query: '$.:queryKey',
    authorizationToken: ':authToken',
    returnValueTest: rvt,
  };

  it('handles context params for rpc condition', () => {
    const condition = ConditionFactory.conditionFromProps(rpcCondition);
    const conditionContext = new ConditionContext(condition);

    // Verify all context parameters are detected
    expect(conditionContext.requestedContextParameters).toEqual(
      new Set([':userAddress', ':blockNumber', ':expectedResult']),
    );
  });
  it('handles context params for time condition', () => {
    const condition = ConditionFactory.conditionFromProps(timeCondition);
    const conditionContext = new ConditionContext(condition);

    // Verify all context parameters are detected
    expect(conditionContext.requestedContextParameters).toEqual(
      new Set([':expectedResult']),
    );
  });
  it('handles context params for contract condition', () => {
    const condition = ConditionFactory.conditionFromProps(contractCondition);
    const conditionContext = new ConditionContext(condition);

    // Verify all context parameters are detected
    expect(conditionContext.requestedContextParameters).toEqual(
      new Set([':userAddress', ':expectedResult']),
    );
  });
  it('handles context params for json api condition', () => {
    const condition = ConditionFactory.conditionFromProps(jsonApiCondition);
    const conditionContext = new ConditionContext(condition);

    // Verify all context parameters are detected
    expect(conditionContext.requestedContextParameters).toEqual(
      new Set([
        ':userId',
        ':endpoint',
        ':value1',
        ':query',
        ':authToken',
        ':expectedResult',
      ]),
    );
  });
  it('handles context params for json rpc condition (params dict)', () => {
    const condition = ConditionFactory.conditionFromProps(
      jsonRpcConditionParamsDict,
    );
    const conditionContext = new ConditionContext(condition);

    // Verify all context parameters are detected
    expect(conditionContext.requestedContextParameters).toEqual(
      new Set([
        ':version',
        ':value2',
        ':queryKey',
        ':authToken',
        ':expectedResult',
      ]),
    );
  });
  it('handles context params for json rpc condition (params array)', () => {
    const condition = ConditionFactory.conditionFromProps(
      jsonRpcConditionParamsArray,
    );
    const conditionContext = new ConditionContext(condition);

    // Verify all context parameters are detected
    expect(conditionContext.requestedContextParameters).toEqual(
      new Set([
        ':version',
        ':value1',
        ':value2',
        ':queryKey',
        ':authToken',
        ':expectedResult',
      ]),
    );
  });
  it.each([
    {
      conditionType: SequentialConditionType,
      conditionVariables: [
        {
          varName: 'rpc',
          condition: rpcCondition,
        },
        {
          varName: 'time',
          condition: timeCondition,
        },
        {
          varName: 'contract',
          condition: contractCondition,
        },
        {
          varName: 'jsonApi',
          condition: jsonApiCondition,
        },
        {
          varName: 'sequential',
          condition: {
            conditionType: SequentialConditionType,
            conditionVariables: [
              {
                varName: 'jsonRpcParamsDict',
                condition: jsonRpcConditionParamsDict,
              },
              {
                varName: 'jsonRpcParamsArray',
                condition: jsonRpcConditionParamsArray,
              },
            ],
          },
        },
      ],
    },
    {
      conditionType: CompoundConditionType,
      operator: 'or',
      operands: [
        jsonApiCondition,
        jsonRpcConditionParamsDict,
        {
          conditionType: CompoundConditionType,
          operator: 'and',
          operands: [jsonRpcConditionParamsArray, rpcCondition, timeCondition],
        },
        {
          conditionType: CompoundConditionType,
          operator: 'not',
          operands: [contractCondition],
        },
      ],
    },
    {
      conditionType: IfThenElseConditionType,
      ifCondition: rpcCondition,
      thenCondition: jsonRpcConditionParamsArray,
      elseCondition: {
        conditionType: CompoundConditionType,
        operator: 'and',
        operands: [
          timeCondition,
          contractCondition,
          jsonApiCondition,
          jsonRpcConditionParamsDict,
        ],
      },
    },
  ])('handles context params for logical conditions', (logicalCondition) => {
    const condition = ConditionFactory.conditionFromProps(logicalCondition);
    const conditionContext = new ConditionContext(condition);
    // Verify all context parameters are detected
    expect(conditionContext.requestedContextParameters).toEqual(
      new Set([
        ':version',
        ':userAddress',
        ':blockNumber',
        ':userId',
        ':endpoint',
        ':value1',
        ':value2',
        ':query',
        ':queryKey',
        ':authToken',
        ':expectedResult',
      ]),
    );
  });
});
