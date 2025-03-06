import { SiweMessage } from 'siwe';

import { AuthProvider } from '../../auth-provider';

import { EIP4361_AUTH_METHOD, EIP4361AuthSignature } from './auth';

/**
 * SingleSignOnEIP4361AuthProvider handles Sign-In with Ethereum (EIP-4361/SIWE) authentication
 * using an existing SIWE message and signature.
 *
 * This provider validates and reuses an existing SIWE message and signature rather than generating new ones.
 * It's useful for implementing single sign-on flows where the SIWE authentication was performed elsewhere.
 */
export class SingleSignOnEIP4361AuthProvider implements AuthProvider {
  /**
   * Creates a new SingleSignOnEIP4361AuthProvider from an existing SIWE message and signature.
   *
   * @param existingSiweMessage - The existing SIWE message string to validate and reuse
   * @param signature - The signature corresponding to the SIWE message
   * @returns A new SingleSignOnEIP4361AuthProvider instance
   * @throws {Error} If signature verification fails or message parameters are invalid
   */
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

  /**
   * Private constructor - use fromExistingSiweInfo() to create instances.
   *
   * @param existingSiweMessage - The validated SIWE message string
   * @param address - The Ethereum address that signed the message
   * @param signature - The validated signature
   */
  private constructor(
    private readonly existingSiweMessage: string,
    public readonly address: string,
    private readonly signature: string,
  ) {}

  /**
   * Returns the existing auth signature after re-validating it.
   *
   * This method verifies that the stored signature and message are still valid
   * before returning them as an EIP4361AuthSignature object.
   *
   * @returns {Promise<EIP4361AuthSignature>} The validated authentication signature
   * @throws {Error} If signature verification fails
   */
  public async getOrCreateAuthSignature(): Promise<EIP4361AuthSignature> {
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
