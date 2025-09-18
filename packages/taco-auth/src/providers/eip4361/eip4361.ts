import {
  Account,
  ProviderLike,
  PublicClient,
  SignerLike,
  TACoSigner,
  toEthersProvider,
  toTACoSigner,
} from '@nucypher/shared';
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

import { AuthProvider } from '../../auth-provider';
import { LocalStorage } from '../../storage';

import {
  EIP4361_AUTH_METHOD,
  EIP4361AuthSignature,
  eip4361AuthSignatureSchema,
} from './auth';

export type EIP4361AuthProviderParams = {
  domain: string;
  uri: string;
};

export const FRESHNESS_IN_MILLISECONDS = 2 * 60 * 60 * 1000;

const TACO_DEFAULT_DOMAIN = 'taco.build';
const TACO_DEFAULT_URI = 'https://taco.build';

/**
 * Implements Sign-In with Ethereum (EIP-4361/SIWE) authentication by managing SIWE message lifecycle.
 *
 * This provider handles:
 * - Creating and signing new SIWE messages
 * - Storing signed messages in local storage
 * - Retrieving and validating stored messages
 * - Automatically refreshing expired messages
 *
 * Messages are valid for 2 hours from creation and stored locally keyed by the signer's address.
 *
 * Supports both ethers.js and viem.
 *
 * @implements {AuthProvider}
 *
 * @example Ethers.js usage
 * ```typescript
 * const provider = new ethers.providers.JsonRpcProvider();
 * const signer = new ethers.Wallet(privateKey, provider);
 * const authProvider = new EIP4361AuthProvider(provider, signer);
 * ```
 *
 * @example Viem usage
 * ```typescript
 * const publicClient = createPublicClient({ chain: polygon, transport: http() });
 * const account = privateKeyToAccount('0x...');
 * const authProvider = new EIP4361AuthProvider(publicClient, account);
 * ```
 */
export class EIP4361AuthProvider implements AuthProvider {
  private readonly storage: LocalStorage<EIP4361AuthSignature>;
  private readonly providerParams: EIP4361AuthProviderParams;
  private readonly provider: ethers.providers.Provider;
  private readonly signer: TACoSigner;

  /**
   * Creates a new EIP4361AuthProvider instance with ethers.js objects.
   *
   * @param provider - Ethers provider used to fetch the current chainId
   * @param signer - Ethers signer used to sign SIWE messages
   * @param providerParams - Optional SIWE message configuration
   * @param providerParams.domain - Domain name for the signing request (e.g. 'app.example.com').
   *                               Defaults to current website domain or 'taco.build'
   * @param providerParams.uri - Full URI of signing request origin (e.g. 'https://app.example.com').
   *                            Defaults to current website URL or 'https://taco.build'
   *
   * The SIWE message will include:
   * - A human-readable statement: "{domain} wants you to sign in with your Ethereum account: {address}"
   * - Version: "1"
   * - 2 hour expiration from creation time
   * - Chain ID from the provided provider
   * - Nonce: Auto-generated
   */
  constructor(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    providerParams?: EIP4361AuthProviderParams,
  );

  /**
   * Creates a new EIP4361AuthProvider instance with viem objects.
   *
   * @param publicClient - Viem public client used to fetch the current chainId
   * @param account - Viem account used to sign SIWE messages
   * @param providerParams - Optional SIWE message configuration
   * @param providerParams.domain - Domain name for the signing request (e.g. 'app.example.com').
   *                               Defaults to current website domain or 'taco.build'
   * @param providerParams.uri - Full URI of signing request origin (e.g. 'https://app.example.com').
   *                            Defaults to current website URL or 'https://taco.build'
   *
   * The SIWE message will include:
   * - A human-readable statement: "{domain} wants you to sign in with your Ethereum account: {address}"
   * - Version: "1"
   * - 2 hour expiration from creation time
   * - Chain ID from the provided provider
   * - Nonce: Auto-generated
   */
  constructor(
    publicClient: PublicClient,
    account: Account,
    providerParams?: EIP4361AuthProviderParams,
  );

  constructor(
    providerLike: ProviderLike,
    signerLike: SignerLike,
    providerParams?: EIP4361AuthProviderParams,
  ) {
    this.storage = new LocalStorage(eip4361AuthSignatureSchema);
    this.provider = toEthersProvider(providerLike);
    this.signer = toTACoSigner(signerLike);
    if (providerParams) {
      this.providerParams = providerParams;
    } else {
      this.providerParams = this.getDefaultParameters();
    }
  }

  /**
   * Gets default domain and URI parameters based on runtime environment.
   *
   * @returns Default parameters object with domain and uri
   * @returns.domain - Host domain from window.location or 'taco.build'
   * @returns.uri - Origin URL from window.location or 'https://taco.build'
   * @private
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
   * Gets a valid auth signature, either from storage or by creating a new one.
   *
   * Process:
   * 1. Check local storage for existing signature for the signer's address
   * 2. If found, verify the signature and expiration time
   * 3. If verification fails or no signature exists, create and store a new one
   * 4. Return the valid signature
   *
   * @returns Promise resolving to a valid EIP-4361 auth signature containing:
   * @returns.signature - The signed SIWE message
   * @returns.address - The signer's Ethereum address
   * @returns.scheme - Authentication scheme ('eip4361')
   * @returns.typedData - Original SIWE message string
   */
  public async getOrCreateAuthSignature(): Promise<EIP4361AuthSignature> {
    const address = await this.signer.getAddress();
    const storageKey = `eth-${EIP4361_AUTH_METHOD}-message-${address}`;

    // If we have a signature in localStorage, return it
    const maybeSignature = this.storage.getAuthSignature(storageKey);
    if (maybeSignature) {
      const siweMessage = new SiweMessage(maybeSignature.typedData);
      try {
        // check message validity specifically here for the `expirationTime`.
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
   * Creates and signs a new SIWE authentication message.
   *
   * Process:
   * 1. Get signer's address and current chain ID
   * 2. Create SIWE message with 2 hour expiration
   * 3. Sign message with signer
   * 4. Return signed auth signature object
   *
   * @returns Promise resolving to newly created and signed auth signature
   * @private
   */
  private async createSIWEAuthMessage(): Promise<EIP4361AuthSignature> {
    const address = await this.signer.getAddress();
    const { domain, uri } = this.providerParams;
    const version = '1';
    const chainId = (await this.provider.getNetwork()).chainId;
    const siweMessage = new SiweMessage({
      domain,
      address,
      statement: `${domain} wants you to sign in with your Ethereum account: ${address}`,
      uri,
      version,
      chainId,
      // set the expirationTime to 2 hours from now
      expirationTime: new Date(
        Date.now() + FRESHNESS_IN_MILLISECONDS,
      ).toISOString(),
    });
    const scheme = EIP4361_AUTH_METHOD;
    const message = siweMessage.prepareMessage();
    const signature = await this.signer.signMessage(message);
    return { signature, address, scheme, typedData: message };
  }
}
