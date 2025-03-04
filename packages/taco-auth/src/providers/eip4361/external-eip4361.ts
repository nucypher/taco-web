import { SiweMessage } from 'siwe';

import { AuthSignature } from '../../auth-sig';

import { EIP4361_AUTH_METHOD, IEIP4361AuthProvider } from './common';

async function createVerifiedSiweMessage(
  message: string,
  signature: string,
): Promise<SiweMessage> {
  const siweMessage = new SiweMessage(message);
  // this will trigger validation for all parameters including `expirationTime` and `notBefore`.
  // It will also throw if the signature is invalid.
  // Because this an async method, it could not be directly called at the contructor.
  await siweMessage.verify({ signature: signature });

  return siweMessage;
}

export class SingleSignOnEIP4361AuthProvider implements IEIP4361AuthProvider {
  public static async fromExistingSiweInfo(
    existingSiweMessage: string,
    signature: string,
  ): Promise<SingleSignOnEIP4361AuthProvider> {
    const siweMessage = await createVerifiedSiweMessage(
      existingSiweMessage,
      signature,
    );
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
    await createVerifiedSiweMessage(this.existingSiweMessage, this.signature);
    const scheme = EIP4361_AUTH_METHOD;
    return {
      signature: this.signature,
      address: this.address,
      scheme,
      typedData: this.existingSiweMessage,
    };
  }
}
