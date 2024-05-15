import { Cacao, SiweMessage } from '@didtools/cacao';
import { Wallet } from 'ethers';
import { describe, it } from 'vitest';

describe('hello', () => {
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
