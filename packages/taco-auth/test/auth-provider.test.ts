import {
  bobSecretKeyBytes,
  fakeProvider,
  TEST_SIWE_PARAMS,
} from '@nucypher/test-utils';
import { SiweMessage } from 'siwe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EIP4361AuthProvider,
  SingleSignOnEIP4361AuthProvider,
} from '../src/providers';
import { EIP4361TypedDataSchema } from '../src/providers/eip4361/common';

describe('auth provider', () => {
  const provider = fakeProvider(bobSecretKeyBytes);
  const signer = provider.getSigner();
  const eip4361Provider = new EIP4361AuthProvider(
    provider,
    signer,
    TEST_SIWE_PARAMS,
  );

  it('creates a new SIWE message', async () => {
    const typedSignature = await eip4361Provider.getOrCreateAuthSignature();
    expect(typedSignature.signature).toBeDefined();
    expect(typedSignature.address).toEqual(await signer.getAddress());
    expect(typedSignature.scheme).toEqual('EIP4361');

    const typedDataSiweMessage = new SiweMessage(`${typedSignature.typedData}`);
    expect(typedDataSiweMessage).toBeDefined();
    expect(typedDataSiweMessage.domain).toEqual('localhost');
    expect(typedDataSiweMessage.version).toEqual('1');
    expect(typedDataSiweMessage.nonce).toBeDefined(); // random
    expect(typedDataSiweMessage.uri).toEqual('http://localhost:3000');
    expect(typedDataSiweMessage.chainId).toEqual(
      (await provider.getNetwork()).chainId,
    );
    expect(typedDataSiweMessage.statement).toEqual(
      `${typedDataSiweMessage.domain} wants you to sign in with your Ethereum account: ${await signer.getAddress()}`,
    );
  });

  it('accepts a valid EIP4361 message', async () => {
    const typedSignature = await eip4361Provider.getOrCreateAuthSignature();
    EIP4361TypedDataSchema.parse(typedSignature.typedData);
  });

  it('rejects an invalid EIP4361 message', async () => {
    const typedSignature = await eip4361Provider.getOrCreateAuthSignature();
    typedSignature.typedData = 'invalid-typed-data';
    expect(() =>
      EIP4361TypedDataSchema.parse(typedSignature.typedData),
    ).toThrow();
  });
});

describe('auth provider caching', () => {
  beforeEach(() => {
    // tell vitest we use mocked time
    vi.useFakeTimers();
  });

  afterEach(() => {
    // restoring date after each test run
    vi.useRealTimers();
  });

  const provider = fakeProvider(bobSecretKeyBytes);
  const signer = provider.getSigner();
  const eip4361Provider = new EIP4361AuthProvider(
    provider,
    signer,
    TEST_SIWE_PARAMS,
  );

  it('caches auth signature, but regenerates when expired', async () => {
    const createAuthSignatureSpy = vi.spyOn(
      eip4361Provider,
      'createSIWEAuthMessage' as keyof EIP4361AuthProvider,
    );

    const typedSignature = await eip4361Provider.getOrCreateAuthSignature();
    expect(createAuthSignatureSpy).toHaveBeenCalledTimes(1);

    const typedSignatureSecondCall =
      await eip4361Provider.getOrCreateAuthSignature();
    // auth signature not expired, so spy is not called a 2nd time
    expect(createAuthSignatureSpy).toHaveBeenCalledTimes(1);
    expect(typedSignatureSecondCall).toEqual(typedSignature);

    // time travel to 2h:1m in the future; auth signature is now expired
    const now = new Date();
    now.setHours(now.getHours() + 2, now.getMinutes() + 1);
    vi.setSystemTime(now);

    const typedSignatureThirdCall =
      await eip4361Provider.getOrCreateAuthSignature();
    // auth signature is now expired, so spy is called a 2nd time
    expect(createAuthSignatureSpy).toHaveBeenCalledTimes(2);
    expect(typedSignatureThirdCall).not.toEqual(typedSignature);
  });
});

describe('single sign-on auth provider', async () => {
  const provider = fakeProvider(bobSecretKeyBytes);
  const signer = provider.getSigner();

  const eip4361Provider = new EIP4361AuthProvider(
    provider,
    signer,
    TEST_SIWE_PARAMS,
  );
  const originalTypedSignature =
    await eip4361Provider.getOrCreateAuthSignature();

  it('use existing SIWE message', async () => {
    const originalSiweMessage = originalTypedSignature.typedData;
    const originalSiweSignature = originalTypedSignature.signature;

    const singleSignOnProvider =
      await SingleSignOnEIP4361AuthProvider.fromExistingSiweInfo(
        originalSiweMessage,
        originalSiweSignature,
      );

    const typedSignature =
      await singleSignOnProvider.getOrCreateAuthSignature();
    expect(typedSignature.typedData).toEqual(originalSiweMessage);
    expect(typedSignature.signature).toEqual(originalSiweSignature);
    expect(typedSignature.address).toEqual(await signer.getAddress());
    expect(typedSignature.scheme).toEqual('EIP4361');
  });
});
