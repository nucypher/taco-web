import { SiweMessage } from 'siwe';

import { AuthProvider } from '../../auth-provider.js';

import { EIP4361_AUTH_METHOD, EIP4361AuthSignature } from './auth.js';
import { FRESHNESS_IN_MILLISECONDS } from './eip4361.js';

async function generateAndVerifySiweMessage(
  message: string,
  signature: string,
): Promise<SiweMessage> {
  const siweMessage = new SiweMessage(message);
  // this will trigger validation for the signature and all parameters (`expirationTime`, `notBefore`...).
  await siweMessage.verify({ signature });
  const twoHoursBeforeNow = new Date(Date.now() - FRESHNESS_IN_MILLISECONDS);
  if (!siweMessage.issuedAt) {
    throw new Error(
      // this should never happen
      `The SIWE message is missing an \`issuedAt\` field and would be rejected by TACo nodes.`,
    );
  }
  if (new Date(siweMessage.issuedAt) < twoHoursBeforeNow) {
    throw new Error(
      `The SIWE message was issued more than 2 hours ago and would be rejected by TACo nodes.`,
    );
  }
  const now = new Date();
  if (new Date(siweMessage.issuedAt) > now) {
    throw new Error(
      `The SIWE message was issued at a future datetime: ${siweMessage.issuedAt} and would be rejected by TACo nodes.`,
    );
  }

  return siweMessage;
}

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
    const siweMessage = await generateAndVerifySiweMessage(
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
    await generateAndVerifySiweMessage(
      this.existingSiweMessage,
      this.signature,
    );

    const scheme = EIP4361_AUTH_METHOD;
    return {
      signature: this.signature,
      address: this.address,
      scheme,
      typedData: this.existingSiweMessage,
    };
  }
}
