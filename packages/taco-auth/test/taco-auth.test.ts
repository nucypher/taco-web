import {
  bobSecretKeyBytes,
  fakeProvider,
  fakeSigner,
} from '@nucypher/test-utils';
import { SiweMessage } from 'siwe';
import { describe, expect, it } from 'vitest';

import {
  EIP4361SignatureProvider,
  EIP712SignatureProvider,
  FormattedEIP712,
} from '../src';

describe('taco authorization', () => {
  it('creates a new EIP-712 message', async () => {
    const provider = fakeProvider(bobSecretKeyBytes);
    const signer = fakeSigner(bobSecretKeyBytes);
    const eip712Provider = new EIP712SignatureProvider(provider, signer);

    const eip712Message = await eip712Provider.getOrCreateWalletSignature();

    // Expected format:
    //     {
    //       "signature": "<signature>",
    //       "address": "<address>",
    //       "scheme": "EIP712" | "EIP4361" | ...
    //       "typeData": ...
    //     }

    expect(eip712Message.signature).toBeDefined();
    expect(eip712Message.address).toEqual(await signer.getAddress());
    expect(eip712Message.scheme).toEqual('EIP712');

    const typedData = eip712Message.typedData as FormattedEIP712;
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
    expect(typedData.message).toHaveProperty('blockHash');
  });

  it('creates a new SIWE message', async () => {
    const provider = fakeProvider(bobSecretKeyBytes);
    const signer = fakeSigner(bobSecretKeyBytes);

    const eip4361Provider = new EIP4361SignatureProvider(provider, signer);
    const typedSignature = await eip4361Provider.getOrCreateWalletSignature();

    // Expected format:
    //     {
    //       "signature": "<signature>",
    //       "address": "<address>",
    //       "scheme": "EIP712" | "EIP4361" | ...
    //       "typedData": ...
    //     }

    expect(typedSignature.signature).toBeDefined();
    expect(typedSignature.address).toEqual(await signer.getAddress());
    expect(typedSignature.scheme).toEqual('EIP4361');

    console.log(typedSignature.typedData);
    const typedDataSiweMessage = new SiweMessage(`${typedSignature.typedData}`);
    expect(typedDataSiweMessage).toBeDefined();
    expect(typedDataSiweMessage.domain).toEqual('TACo');
    expect(typedDataSiweMessage.version).toEqual('1');
    expect(typedDataSiweMessage.nonce).toBeDefined(); // random
    expect(typedDataSiweMessage.uri).toEqual('https://TACo');
    expect(typedDataSiweMessage.chainId).toEqual(
      (await provider.getNetwork()).chainId,
    );
    expect(typedDataSiweMessage.statement).toEqual(
      `${typedDataSiweMessage.domain} wants you to sign in with your Ethereum account: ${await signer.getAddress()}`,
    );
  });
});
