import { SiweMessage } from 'siwe';

import { AuthSignature } from '../../auth-sig';

import { EIP4361_AUTH_METHOD } from './common';

export const USER_ADDRESS_PARAM_EXTERNAL_EIP4361 =
  ':userAddressExternalEIP4361';

export class SingleSignOnEIP4361AuthProvider {
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

  private constructor(
    private readonly existingSiweMessage: string,
    public readonly address: string,
    private readonly signature: string,
  ) {}

  public async getOrCreateAuthSignature(): Promise<AuthSignature> {
    const scheme = EIP4361_AUTH_METHOD;
    return {
      signature: this.signature,
      address: this.address,
      scheme,
      typedData: this.existingSiweMessage,
    };
  }
}
