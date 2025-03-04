import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

import { AuthSignature } from '../../auth-sig';

import { BaseEIP4361AuthProvider } from './base-eip4361';
import { EIP4361_AUTH_METHOD } from './common';

const ERR_MISSING_SIWE_PARAMETERS = 'Missing default SIWE parameters';

export class EIP4361AuthProvider extends BaseEIP4361AuthProvider {
  private readonly params: Partial<SiweMessage>;

  public override getAddress(): Promise<string> {
    if (!this.signer || !this.signer.getAddress) {
      console.log('no signer');
    }
    return this.signer.getAddress();
  }
  constructor(
    private readonly signer: ethers.Signer,
    params: Partial<SiweMessage>,
  ) {
    super();
    this.params = {
      ...this.getDefaultParameters(),
      expirationTime: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
      version: '1',
      // the next means that if any of the parameters where provided at params, they will override the defaults
      ...params,
    };
    if (!this.params.domain || !this.params.uri) {
      throw new Error(ERR_MISSING_SIWE_PARAMETERS);
    }
  }

  private getDefaultParameters() {
    if (typeof window !== 'undefined') {
      // If we are in a browser environment, we can get the domain and uri from the window object
      return {
        domain: window.location?.host,
        uri: window.location?.origin,
      };
    }
  }

  protected override async createSIWEAuthMessage(): Promise<AuthSignature> {
    const address = await this.signer.getAddress();
    const siweMessage = new SiweMessage({
      ...this.params,
      address,
      statement: `${this.params.domain} wants you to sign in with your Ethereum account: ${address}`,
    });
    const scheme = EIP4361_AUTH_METHOD;

    const message = siweMessage.prepareMessage();
    const signature = await this.signer.signMessage(message);

    // message does not have domain!
    // 'localhost wants you to sign in with your Ethereum account:\n0xcFBa69aF1C64A9D953597A535B92BC7bccD826B3\n\nlocalhost wants you to sign in with your Ethereum account: 0xcFBa69aF1C64A9D953597A535B92BC7bccD826B3\n\nURI: http://localhost:3000\nVersion: 1\nChain ID: 1234\nNonce: OHfZ7lZHxW8SZSCb9\nIssued At: 2025-03-04T11:56:32.306Z\nExpiration Time: 2025-03-04T13:54:06.162Z'

    // this will trigger validation for all parameters including `expirationTime` and `notBefore`.
    await siweMessage.verify({
      signature,
    });

    return {
      signature,
      address,
      scheme,
      typedData: message,
    };
  }
}
