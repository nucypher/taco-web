import {
  AccessControlPolicy,
  DkgPublicKey,
  encryptForDkg,
  ThresholdMessageKit,
} from '@nucypher/nucypher-core';
import {
  Account,
  DkgCoordinatorAgent,
  Domain,
  fromHexString,
  getPorterUris,
  PorterClient,
  ProviderLike,
  PublicClient,
  SignerLike,
  TACoSigner,
  toBytes,
  toEthersProvider,
  toTACoSigner,
} from '@nucypher/shared';
import { ethers } from 'ethers';
import { keccak256 } from 'ethers/lib/utils';

import { Condition } from './conditions/condition';
import { ConditionExpression } from './conditions/condition-expr';
import { ConditionContext } from './conditions/context';
import { DkgClient } from './dkg';
import { retrieveAndDecrypt } from './tdec';

/**
 * Encrypts a message gated by TACo Conditions using an ethers.js provider and signer.
 *
 * Use this overload when your application uses ethers.js. For viem-based apps,
 * use the next overload that accepts a `PublicClient` and `Account`.
 *
 * @export
 * @param {ethers.providers.Provider} provider - Ethers provider for network operations.
 * @param {Domain} domain - Logical TACo domain in which encryption will be performed (must match the ritual's domain).
 * @param {Uint8Array | string} message - The message to be encrypted.
 * @param {Condition} condition - Access condition (single or composite) that must be satisfied at decryption time.
 * @param {number} ritualId - ID of the DKG ritual whose public key will be used for encryption.
 * @param {ethers.Signer} authSigner - Signer used to authorize the encryption (EIP‑191 message signature).
 *
 * @returns {Promise<ThresholdMessageKit>} Encrypted message kit representing the ciphertext and access policy.
 *
 * @throws {Error} If the ritual cannot be retrieved or encryption fails.
 */
// Function overloads for encrypt
export async function encrypt(
  provider: ethers.providers.Provider,
  domain: Domain,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
  authSigner: ethers.Signer,
): Promise<ThresholdMessageKit>;

/**
 * Encrypts a message gated by TACo Conditions using a viem `PublicClient` and `Account`.
 *
 * Use this overload when your application uses viem.
 *
 * @export
 * @param {PublicClient} publicClient - Viem `PublicClient` for network operations.
 * @param {Domain} domain - Logical TACo domain in which encryption will be performed (must match the ritual's domain).
 * @param {Uint8Array | string} message - The message to be encrypted.
 * @param {Condition} condition - Access condition (single or composite) that must be satisfied at decryption time.
 * @param {number} ritualId - ID of the DKG ritual whose public key will be used for encryption.
 * @param {Account} authAccount - Viem account used to authorize the encryption (message signature).
 *
 * @returns {Promise<ThresholdMessageKit>} Encrypted message kit representing the ciphertext and access policy.
 *
 * @throws {Error} If the ritual cannot be retrieved or encryption fails.
 */
export async function encrypt(
  publicClient: PublicClient,
  domain: Domain,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
  authAccount: Account,
): Promise<ThresholdMessageKit>;

export async function encrypt(
  providerLike: ProviderLike,
  domain: Domain,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
  signerLike: SignerLike,
): Promise<ThresholdMessageKit> {
  // TODO(#264): Enable ritual initialization
  // if (ritualId === undefined) {
  //   ritualId = await DkgClient.initializeRitual(
  //     provider,
  //     this.cohort.ursulaAddresses,
  //     true
  //   );
  // }
  // if (ritualId === undefined) {
  //   // Given that we just initialized the ritual, this should never happen
  //   throw new Error('Ritual ID is undefined');
  // }

  // Create TACo provider and signer adapters from viem objects
  const providerAdapter = toEthersProvider(providerLike);

  const dkgRitual = await DkgClient.getActiveRitual(
    providerAdapter,
    domain,
    ritualId,
  );

  return await encryptWithPublicKey(
    message,
    condition,
    dkgRitual.dkgPublicKey,
    // Casting is needed because with the function definition of encryptWithPublicKey,
    // this param can be either a TACoSigner or a viem Account. But not a type that is the union of both.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signerLike as any,
  );
}

/**
 * Encrypts a message with the given DKG public key gated by TACo Conditions.
 *
 * @export
 * @param {Uint8Array | string} message - The message to be encrypted.
 * @param {Condition} condition - Access condition (single or composite) that must be satisfied at decryption time.
 * @param {DkgPublicKey} dkgPublicKey - The public key of an active DKG Ritual to be used for encryption
 * @param {SignerLike} authSigner - Signer used to authorize the encryption. Accepts an ethers `Signer` or a viem `Account`.
 *
 * @returns {Promise<ThresholdMessageKit>} Encrypted message kit representing the ciphertext and access policy.
 *
 * @throws {Error} If the encryption process throws an error, an error is thrown.
 */
export async function encryptWithPublicKey(
  message: Uint8Array | string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  authSigner: TACoSigner,
): Promise<ThresholdMessageKit>;

/**
 * Encrypts a message with the given DKG public key gated by TACo Conditions.
 *
 * @export
 * @param {Uint8Array | string} message - The message to be encrypted.
 * @param {Condition} condition - Access condition (single or composite) that must be satisfied at decryption time.
 * @param {DkgPublicKey} dkgPublicKey - The public key of an active DKG Ritual to be used for encryption
 * @param {Account} authAccount - Viem account used to authorize the encryption.
 *
 * @returns {Promise<ThresholdMessageKit>} Encrypted message kit representing the ciphertext and access policy.
 *
 * @throws {Error} If the encryption process throws an error, an error is thrown.
 */
export async function encryptWithPublicKey(
  message: Uint8Array | string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  authAccount: Account,
): Promise<ThresholdMessageKit>;

export async function encryptWithPublicKey(
  message: Uint8Array | string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  signerLike: SignerLike,
): Promise<ThresholdMessageKit> {
  if (typeof message === 'string') {
    message = toBytes(message);
  }

  const signer = toTACoSigner(signerLike);

  const conditionExpr = new ConditionExpression(condition);

  const [ciphertext, authenticatedData] = encryptForDkg(
    message,
    dkgPublicKey,
    conditionExpr.toCoreCondition(),
  );

  const headerHash = keccak256(ciphertext.header.toBytes());
  const authorization = await signer.signMessage(fromHexString(headerHash));
  const acp = new AccessControlPolicy(
    authenticatedData,
    fromHexString(authorization),
  );

  return new ThresholdMessageKit(ciphertext, acp);
}

/**
 * Decrypts an encrypted message (ethers overload).
 *
 * @export
 * @param {ethers.providers.Provider} provider - Ethers provider for network operations.
 * @param {Domain} domain - Logical TACo domain used for decryption.
 * @param {ThresholdMessageKit} messageKit - The kit containing the ciphertext and access policy.
 * @param {ConditionContext} [context] - Optional context data (e.g., time values) used by conditions in the `messageKit`.
 * @param {string[]} [porterUris] - Optional Porter service URI(s). If omitted, they are resolved via `getPorterUris(domain)`.
 *
 * @returns {Promise<Uint8Array>} The decrypted message bytes.
 *
 * @throws {Error} If the ritual cannot be resolved, Porter retrieval fails, or decryption fails.
 */
export function decrypt(
  provider: ethers.providers.Provider,
  domain: Domain,
  messageKit: ThresholdMessageKit,
  context?: ConditionContext,
  porterUris?: string[],
): Promise<Uint8Array>;

/**
 * Decrypts an encrypted message (viem overload).
 *
 * @export
 * @param {PublicClient} publicClient - Viem `PublicClient` for network operations.
 * @param {Domain} domain - Logical TACo domain used for decryption.
 * @param {ThresholdMessageKit} messageKit - The kit containing the ciphertext and access policy.
 * @param {ConditionContext} [context] - Optional context data (e.g., time values) used by conditions in the `messageKit`.
 * @param {string[]} [porterUris] - Optional Porter service URI(s). If omitted, they are resolved via `getPorterUris(domain)`.
 *
 * @returns {Promise<Uint8Array>} The decrypted message bytes.
 *
 * @throws {Error} If the ritual cannot be resolved, Porter retrieval fails, or decryption fails.
 */
export function decrypt(
  publicClient: PublicClient,
  domain: Domain,
  messageKit: ThresholdMessageKit,
  context?: ConditionContext,
  porterUris?: string[],
): Promise<Uint8Array>;

export async function decrypt(
  providerLike: ProviderLike,
  domain: Domain,
  messageKit: ThresholdMessageKit,
  context?: ConditionContext,
  porterUris?: string[],
): Promise<Uint8Array> {
  const porterUrisFull: string[] = porterUris
    ? porterUris
    : await getPorterUris(domain);
  const porter = new PorterClient(porterUrisFull);

  const providerAdapter = toEthersProvider(providerLike);

  const ritualId = await DkgCoordinatorAgent.getRitualIdFromPublicKey(
    providerAdapter,
    domain,
    messageKit.acp.publicKey,
  );
  return retrieveAndDecrypt(
    providerAdapter,
    domain,
    porter,
    messageKit,
    ritualId,
    context,
  );
}
