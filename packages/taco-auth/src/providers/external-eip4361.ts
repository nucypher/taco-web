import { SiweMessage } from 'siwe';

import { EIP4361_AUTH_METHOD } from '../auth-provider';
import { AuthSignature } from '../auth-sig';


export class SingleSignOnEIP4361AuthProvider {
  public static async fromExistingSiweInfo(existingSiweMessage: string, signature: string): Promise<SingleSignOnEIP4361AuthProvider> {
    // validation
    const siweMessage = new SiweMessage(existingSiweMessage);
    await siweMessage.verify({signature});
    // create provider
    const authProvider = new SingleSignOnEIP4361AuthProvider(siweMessage.prepareMessage(), siweMessage.address, signature);
    return authProvider;
  }

  private constructor(
    private readonly existingSiweMessage: string,
    private readonly address: string,
    private readonly signature: string,
  ) {
  }

  public async getOrCreateAuthSignature(): Promise<AuthSignature> {
    const scheme = EIP4361_AUTH_METHOD;
    return { signature: this.signature, address: this.address, scheme, typedData: this.existingSiweMessage };
  }
}
