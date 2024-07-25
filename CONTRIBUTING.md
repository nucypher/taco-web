# Contribution Guide

- [Quick Start](#quick-start)
  - [Setup](#setup)
  - [Basic Development Commands](#basic-development-commands)
  - [Documentation](#documentation)
  - [Publishing](#publishing)
- [External Api](#external-api)
- [Design and Architecture](#design-and-architecture)
  - [Context Parameters](#context-parameters)
  - [Authentication Providers](#authentication-providers)
# Quick Start

### Setup
Download and install with:

```bash
git clone https://github.com/nucypher/taco-web
cd taco-web
pnpm install
```

### Basic Development Commands

Execute common tasks with:

```bash
pnpm build
pnpm test
pnpm lint
pnpm fix
```

### Documentation

Build and publish documentation with:

```bash
pnpm typedoc
pnpm typedoc:publish
```

### Publishing

TODO: Update after implementing automated publishing.

# External API
This is the api that we expose to developers.
It is defined in [`packages/taco/src/taco.ts`](https://github.com/nucypher/taco-web/blob/main/packages/taco/src/taco.ts)

# Design and Architecture

## Context Parameters
When defining conditions for decryption, context parameters are specified to indicate what information is required.
These parameters are placeholders that will be filled with actual data during the decryption process.

The built in `:userAddress` parameter is defined in `packages/taco-auth/src/auth-provider.ts`.
Custom context parameters can also be defined and they must always begin with `:`.

[This test](https://github.com/nucypher/taco-web/blob/b689493a37bec0b168f80f43347818095c3dd5ce/packages/taco/test/taco.test.ts#L102) demonstrates the functionality:
```typescript
  it('exposes requested parameters', async () => {
    const mockedDkg = fakeDkgFlow(FerveoVariant.precomputed, 0, 4, 4);
    const mockedDkgRitual = fakeDkgRitual(mockedDkg);
    const provider = fakeProvider(aliceSecretKeyBytes);
    const signer = fakeSigner(aliceSecretKeyBytes);
    const getFinalizedRitualSpy = mockGetActiveRitual(mockedDkgRitual);

    const customParamKey = ':nftId';
    const ownsNFTWithCustomParams = new conditions.predefined.erc721.ERC721Ownership({
      contractAddress: '0x1e988ba4692e52Bc50b375bcC8585b95c48AaD77',
      parameters: [customParamKey],
      chain: TEST_CHAIN_ID,
    });

    const messageKit = await taco.encrypt(
      provider,
      domains.DEVNET,
      message,
      ownsNFTWithCustomParams,
      mockedDkg.ritualId,
      signer,
    );
    expect(getFinalizedRitualSpy).toHaveBeenCalled();

    const requestedParameters = taco.conditions.context.ConditionContext.requestedContextParameters(messageKit);
    expect(requestedParameters).toEqual(new Set([customParamKey, USER_ADDRESS_PARAM_DEFAULT]));
  });
```

## Authentication Providers
User authentication is handled by an `AuthProvider` defined in `packages/taco-auth/src`.
Using authentication providers has several benefits:
1. Abstraction:

    They abstract away the specific details of authentication, providing a unified interface for different authentication methods.

2. Flexibility:

    The system can accommodate various types of authentication providers, making it extensible and adaptable to different authentication needs.

3. User Context Management:

    They help manage user context, specifically the `:userAddress` parameter. This includes handling authentication tokens and ensuring that users are authenticated only once for multiple actions.

Currently, [SIWE](https://docs.login.xyz/) (Sign-In With Ethereum, [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361)) is the only authentication method implemented.
EIP-712 has previously been supported but is now deprecated.

[The below test](https://github.com/nucypher/taco-web/blob/b689493a37bec0b168f80f43347818095c3dd5ce/packages/taco/test/conditions/context.test.ts#L382C1-L429C6) demonstrates how a SIWE message can be reused for TACo authentication.
This ensures that users don't have to sign multiple messages when logging into apps and decrypting TACo messages.

```typescript
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
    expect(
      () => conditionExpr.buildContext( {}, authProviders)
    ).toThrow(
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
```