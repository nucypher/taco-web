import { SiweMessage } from 'siwe';

import { AuthSignature } from '../../auth-sig';

import { BaseEIP4361AuthProvider } from './base-eip4361';
import { EIP4361_AUTH_METHOD } from './common';

export class SingleSignOnEIP4361AuthProvider extends BaseEIP4361AuthProvider {
  public override getAddress(): string {
    return this.address;
  }

  public static async fromExistingSiweInfo(
    existingSiweMessage: string,
    signature: string,
  ): Promise<SingleSignOnEIP4361AuthProvider> {
    // validation
    const siweMessage = new SiweMessage(existingSiweMessage);
    await siweMessage.verify({ signature });

    // create provider
    const authProvider = new SingleSignOnEIP4361AuthProvider(
      siweMessage.prepareMessage(),
      siweMessage.address,
      signature,
    );
    return authProvider;
  }

  public constructor(
    private readonly existingSiweMessage: string,
    public readonly address: string,
    private readonly signature: string,
  ) {
    super();
  }

  protected override async createSIWEAuthMessage(): Promise<AuthSignature> {
    const siweMessage = new SiweMessage(this.existingSiweMessage);
    // this will trigger validation for all parameters including `expirationTime` and `notBefore`.
    // It will also throw if the signature is invalid.
    // Because this an async method, it could not be directly called at the contructor.
    await siweMessage.verify({ signature: this.signature });

    const scheme = EIP4361_AUTH_METHOD;
    return {
      signature: this.signature,
      address: this.address,
      scheme,
      typedData: this.existingSiweMessage,
    };
  }
}
