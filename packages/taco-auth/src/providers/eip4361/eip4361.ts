import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

import { AuthProvider } from '../../auth-provider';
import { LocalStorage } from '../../storage';

import {
  EIP4361_AUTH_METHOD,
  EIP4361AuthSignature,
  eip4361AuthSignatureSchema,
} from './auth';

const TACO_DEFAULT_DOMAIN = 'taco.build';
const TACO_DEFAULT_URI = 'https://taco.build';

/**
 * EIP4361AuthProvider implements the AuthProvider interface to handle Sign-In with Ethereum (EIP-4361/SIWE) authentication.
 * This provider manages the creation, storage, and verification of SIWE messages for authentication purposes.
 */
export class EIP4361AuthProvider implements AuthProvider {
  private readonly storage: LocalStorage<EIP4361AuthSignature>;
  private readonly params: Partial<SiweMessage>;
  private readonly expirationDuration: number;
  /**
   * Creates a new EIP4361AuthProvider to handle Sign-In with Ethereum (SIWE) authentication.
   *
   * This provider generates and manages SIWE messages with configurable parameters while enforcing
   * security best practices like expiration time limits. It automatically handles message storage
   * and retrieval using LocalStorage.
   *
   * @param provider - An ethers provider used to fetch the current chainId.
   * @param signer - An ethers signer used to sign the SIWE message.
   * @param params - Optional configuration parameters for the SIWE message.
   * @param params.domain - Domain name for the signing request. Defaults to current website domain or 'taco.build'.
   * @param params.uri - URI identifying the signing request origin. Defaults to current website URL or 'https://taco.build'.
   * @param params.version - SIWE message version. Defaults to '1'.
   * @param params.nonce - Unique identifier for the signing request. Auto-generated if not provided.
   * @param params.expirationTime - ISO datetime when the signature expires. Must be within 2 hours from now. The value will be used to infer the expiration duration timespan.
   * @param params.statement - Human-readable message shown to users during signing. Default is `{{domain}} wants you to sign in with your Ethereum account: {{address}}`.
   * @throws {Error} If expirationTime is set beyond 2 hours from the current time.
   */
  constructor(
    // TODO: We only need the provider to fetch the chainId, consider removing it
    private readonly provider: ethers.providers.Provider,
    private readonly signer: ethers.Signer,
    // `chainId` will be set from the provider. For do not accept it as input to eleminate ambiguity.
    params?: Partial<Omit<Omit<SiweMessage, 'address'>, 'chainId'>>,
  ) {
    this.storage = new LocalStorage(eip4361AuthSignatureSchema);

    const after2HoursFromNow = new Date(
      Date.now() + 2 * 60 * 60 * 1000,
    ).toISOString();
    // if the provided expirationTime was more than 2 hours from now, throw
    if (params?.expirationTime && params.expirationTime > after2HoursFromNow) {
      throw new Error('expirationTime is too soon');
    }
    // infer the expiration duration (Is it 5 min or 1 hour? Max is 2 hours enforced above)
    this.expirationDuration = params?.expirationTime
      ? new Date(params?.expirationTime).getTime() - Date.now()
      : 2 * 60 * 60 * 1000;

    this.params = {
      ...this.getDefaultParameters(),
      version: '1',
      // if any of the parameters were provided at params, they will override the defaults
      ...params,
    };
  }

  /**
   * Determines the default domain and URI parameters based on the execution environment.
   *
   * When running in a browser, uses the current window's location information.
   * Otherwise, falls back to default TACo values: 'taco.build' for domain and 'https://taco.build' for uri.
   *
   * @private
   * @returns {{ domain: string, uri: string }} Default parameter values for SIWE message creation
   */
  private getDefaultParameters() {
    if (typeof window !== 'undefined') {
      // If we are in a browser environment, we can get the domain and uri from the window object
      return {
        domain: window.location?.host,
        uri: window.location?.origin,
      };
    }

    // not in a browser environment, use hardcoded defaults
    return {
      domain: TACO_DEFAULT_DOMAIN,
      uri: TACO_DEFAULT_URI,
    };
  }

  /**
   * Retrieves an existing valid auth signature from storage or creates a new one.
   *
   * This method first checks LocalStorage for a previously created signature. If found,
   * it verifies the signature's validity including expiration time. If the stored
   * signature is invalid or expired, or if no signature exists, it creates a new one.
   *
   * @returns {Promise<EIP4361AuthSignature>} A valid authentication signature object containing:
   *   - signature: The signed message
   *   - address: The signer's Ethereum address
   *   - scheme: The authentication scheme (EIP4361)
   *   - typedData: The original SIWE message
   */
  public async getOrCreateAuthSignature(): Promise<EIP4361AuthSignature> {
    const address = await this.signer.getAddress();
    const storageKey = `eth-${EIP4361_AUTH_METHOD}-message-${address}`;

    // If we have a signature in localStorage, return it
    const maybeSignature = this.storage.getAuthSignature(storageKey);
    if (maybeSignature) {
      const siweMessage = new SiweMessage(maybeSignature.typedData);
      try {
        // check message validity including `expirationTime` and `notBefore`.
        await siweMessage.verify({ signature: maybeSignature.signature });
        return maybeSignature;
      } catch (e) {
        // clear signature so that it will be recreated and stored
        this.storage.clear(storageKey);
      }
    }

    // If at this point we didn't return, we need to create a new message
    const authMessage = await this.createSIWEAuthMessage();
    this.storage.setAuthSignature(storageKey, authMessage);
    return authMessage;
  }

  /**
   * Creates a new Sign-In with Ethereum (SIWE) authentication message and signature.
   *
   * Generates a new SIWE message using the configured parameters and current chain state.
   * The message includes the user's address, current chainId, and other required SIWE fields.
   * After creation, the message is signed by the user's wallet and verified before returning.
   *
   * @private
   * @returns {Promise<EIP4361AuthSignature>} A newly created and signed authentication signature
   * @throws {Error} If message signing fails or verification fails
   */
  private async createSIWEAuthMessage(): Promise<EIP4361AuthSignature> {
    const address = await this.signer.getAddress();
    const chainId = (await this.provider.getNetwork()).chainId;
    const after2HoursFromNow = new Date(
      Date.now() + 2 * 60 * 60 * 1000,
    ).toISOString();

    const siweMessage = new SiweMessage({
      statement: `${this.params.domain} wants you to sign in with your Ethereum account: ${address}`,
      ...this.params,
      address,
      chainId,
      // if the user does not provide an expirationTime, we set it to 2 hours from now
      expirationTime: new Date(
        Date.now() + this.expirationDuration,
      ).toISOString(),
    });
    const scheme = EIP4361_AUTH_METHOD;

    const message = siweMessage.prepareMessage();
    const signature = await this.signer.signMessage(message);

    // this will trigger validation for all parameters including `expirationTime` and `notBefore`.
    await siweMessage.verify({ signature });

    return { signature, address, scheme, typedData: message };
  }
}
