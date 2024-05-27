import { bobSecretKeyBytes, fakeProvider, fakeSigner } from '@nucypher/test-utils';
import { describe, expect, it } from 'vitest';

import { EIP4361SignatureProvider, EIP712SignatureProvider, FormattedEip712 } from '../src';

describe('taco authorization', () => {
  it('creates a new EIP-712 message', async () => {
    const provider = fakeProvider(bobSecretKeyBytes);
    const signer = fakeSigner(bobSecretKeyBytes);
    const eip712Provider = new EIP712SignatureProvider(provider, signer);

    const eip712Message = await eip712Provider.getOrCreateWalletSignature();

    // Expected format:
    // {
    //   ":userAddress":
    //     {
    //       "signature": "<signature>",
    //       "address": "<address>",
    //       "scheme": "EIP712" | "SIWE" | ...
    //       "typeData": ...
    //     }
    // }

    expect(eip712Message.signature).toBeDefined();
    expect(eip712Message.address).toEqual(await signer.getAddress());
    expect(eip712Message.scheme).toEqual('EIP712');

    const typedData = eip712Message.typedData as FormattedEip712;
    expect(typedData).toBeDefined();
    expect(typedData.types.Wallet).toBeDefined();
    expect(typedData.domain.name).toEqual('taco');
    expect(typedData.domain.version).toEqual('1');
    expect(typedData.domain.chainId).toEqual((await provider.getNetwork()).chainId);
    expect(typedData.domain.salt).toBeDefined();
    expect(typedData.message.address).toEqual(await signer.getAddress());
    expect(typedData.message.blockNumber).toEqual(await provider.getBlockNumber());
    expect(typedData.message).toHaveProperty('blockHash');
  });

  it('hello-world', async () => {
    const wallet = Wallet.createRandom();
    const address = wallet.address;

    const siweMessage = new SiweMessage({
      domain: 'service.org',
      address: address,
      statement:
        'I accept the ServiceOrg Terms of Service: https://service.org/tos',
      uri: 'did:key:z6MkrBdNdwUPnXDVD1DCxedzVVBpaGi8aSmoXFAeKNgtAer8',
      version: '1',
      nonce: '32891757',
      issuedAt: '2021-09-30T16:25:24.000Z',
      chainId: '1',
      resources: [
        'ipfs://Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu',
        'https://example.com/my-web2-claim.json',
        'ceramic://k2t6wyfsu4pg040dpjpbla1ybxof65baldb7fvmeam4m3n71q0w1nslz609u2d',
      ],
    });

    const cacao = Cacao.fromSiweMessage(siweMessage);
    const siweMessage2 = SiweMessage.fromCacao(cacao);

    const signature = await wallet.signMessage(siweMessage.toMessage());
    siweMessage2.signature = signature;
  });
});
