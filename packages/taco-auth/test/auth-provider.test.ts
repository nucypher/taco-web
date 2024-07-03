import {
  bobSecretKeyBytes,
  fakeProvider,
  fakeSigner,
  TEST_SIWE_PARAMS,
} from '@nucypher/test-utils';
import { SiweMessage } from 'siwe';
import { describe, expect, it } from 'vitest';

import {
  EIP4361AuthProvider, EIP4361TypedDataSchema,
  EIP712AuthProvider,
  EIP712TypedData,
} from '../src';

describe('auth provider', () => {
  const provider = fakeProvider(bobSecretKeyBytes);
  const signer = fakeSigner(bobSecretKeyBytes);
  const eip712Provider = new EIP712AuthProvider(provider, signer);
  const eip4361Provider = new EIP4361AuthProvider(provider, signer, TEST_SIWE_PARAMS);

  it('creates a new EIP-712 message', async () => {
    const eip712Message = await eip712Provider.getOrCreateAuthSignature();
    expect(eip712Message.signature).toBeDefined();
    expect(eip712Message.address).toEqual(await signer.getAddress());
    expect(eip712Message.scheme).toEqual('EIP712');

    const typedData = eip712Message.typedData as EIP712TypedData;
    expect(typedData).toBeDefined();
    expect(typedData.types.Wallet).toBeDefined();
    expect(typedData.domain.name).toEqual('TACo');
    expect(typedData.domain.version).toEqual('1');
    expect(typedData.domain.chainId).toEqual(
      (await provider.getNetwork()).chainId,
    );
    expect(typedData.domain.salt).toBeDefined();
    expect(typedData.message.address).toEqual(await signer.getAddress());
    expect(typedData.message.blockNumber).toEqual(
      await provider.getBlockNumber(),
    );
    expect(typedData.message['blockHash']).toBeDefined();
  });

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
    expect(() => EIP4361TypedDataSchema.parse(typedSignature.typedData)).toThrow();
  });
});
