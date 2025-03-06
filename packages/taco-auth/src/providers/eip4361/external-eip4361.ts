import { SiweMessage } from 'siwe';

import { AuthProvider } from '../../auth-provider';
import { AuthSignature } from '../../auth-sig';

import { EIP4361_AUTH_METHOD } from './common';

export class SingleSignOnEIP4361AuthProvider implements AuthProvider {
  public static async fromExistingSiweInfo(
    existingSiweMessage: string,
    signature: string,
  ): Promise<SingleSignOnEIP4361AuthProvider> {
    const siweMessage = new SiweMessage(existingSiweMessage);
    // this will trigger validation for the signature and all parameters (`expirationTime`, `notBefore`...).
    await siweMessage.verify({ signature });

    // create provider
    const authProvider = new SingleSignOnEIP4361AuthProvider(
      siweMessage.prepareMessage(),
      siweMessage.address,
      signature,
    );
    return authProvider;
  }

  private constructor(
    private readonly existingSiweMessage: string,
    public readonly address: string,
    private readonly signature: string,
  ) {}

  public async getOrCreateAuthSignature(): Promise<AuthSignature> {
    const siweMessage = new SiweMessage(this.existingSiweMessage);
    // this will trigger validation for the signature and all parameters (`expirationTime`, `notBefore`...).
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
