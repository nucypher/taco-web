import { DkgPublicKey, ThresholdMessageKit } from '@nucypher/nucypher-core';
import { type Account, type Domain, type PublicClient } from '@nucypher/shared';
import { createTacoProvider, createTacoSigner } from '@nucypher/shared';
import { ethers } from 'ethers';

import { Condition } from './conditions/condition';
import { ConditionContext } from './conditions/context';
import { decrypt as ethersDecrypt, encrypt as ethersEncrypt, encryptWithPublicKey as ethersEncryptWithPublicKey } from './taco';

/**
 * Encrypts a message under given conditions using viem clients.
 *
 * This is a viem-compatible overload of the encrypt function that accepts viem clients
 * instead of ethers providers and signers.
 *
 * @export
 * @param {PublicClient} viemPublicClient - Viem PublicClient for network operations
 * @param {Domain} domain - Represents the logical network for encryption (must match ritualId)
 * @param {Uint8Array | string} message - The message to be encrypted
 * @param {Condition} condition - Condition under which the message will be encrypted
 * @param {number} ritualId - The ID of the DKG Ritual to be used for encryption
 * @param {Account} viemAuthSigner - The viem account that will be used to sign the encrypter authorization
 *
 * @returns {Promise<ThresholdMessageKit>} Returns Promise that resolves with an instance of ThresholdMessageKit
 *
 * @throws {Error} If the active DKG Ritual cannot be retrieved an error is thrown
 *
 * @example
 * ```typescript
 * import { createPublicClient, createWalletClient, http } from 'viem';
 * import { polygonAmoy } from 'viem/chains';
 * import { privateKeyToAccount } from 'viem/accounts';
 *
 * // Using explicit clients
 * const viemPublicClient = createPublicClient({
 *   chain: polygonAmoy,
 *   transport: http()
 * });
 *
 * const viemAuthSigner = privateKeyToAccount('0x...');
 *
 * const encrypted = await encrypt(
 *   viemPublicClient, // Your viem public client
 *   'lynx',           // TACo domain
 *   'Hello, secret!', // Message to encrypt
 *   condition,        // Access condition
 *   27,               // Ritual ID
 *   viemAuthSigner    // Your viem account
 * );
 * ```
 */
export const encrypt = async (
  viemPublicClient: PublicClient,
  domain: Domain,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
  viemAuthSigner: Account,
): Promise<ThresholdMessageKit> => {
  // Create TACo provider and signer adapters from viem objects
  const tacoProvider = await createTacoProvider(viemPublicClient);
  const tacoSigner = await createTacoSigner(viemAuthSigner, tacoProvider);

  // Use the existing ethers-based encrypt function with type assertions
  // Our adapters provide all the methods that the TACo SDK actually uses
  return await ethersEncrypt(
    tacoProvider as unknown as ethers.providers.Provider,
    domain,
    message,
    condition,
    ritualId,
    tacoSigner as unknown as ethers.Signer,
  );
};

/**
 * Encrypts a message with a public key using viem clients.
 *
 * This is a viem-compatible version of the encryptWithPublicKey function that accepts a viem account
 * instead of an ethers signer.
 *
 * @export
 * @param {Uint8Array | string} message - The message to be encrypted
 * @param {Condition} condition - Condition under which the message will be encrypted
 * @param {DkgPublicKey} dkgPublicKey - The DKG public key to use for encryption
 * @param {Account} viemAuthSigner - The viem account that will be used to sign the encrypter authorization
 *
 * @returns {Promise<ThresholdMessageKit>} Returns Promise that resolves with an instance of ThresholdMessageKit
 *
 * @throws {Error} If the encryption process throws an error, an error is thrown
 *
 * @example
 * ```typescript
 * import { privateKeyToAccount } from 'viem/accounts';
 * import { encryptWithPublicKey } from '@nucypher/taco';
 *
 * const viemAuthSigner = privateKeyToAccount('0x...');
 *
 * const encrypted = await encryptWithPublicKey(
 *   'Hello, secret!', // Message to encrypt
 *   condition,        // Access condition
 *   dkgPublicKey,     // DKG public key
 *   viemAuthSigner    // Your viem account
 * );
 * ```
 */
export const encryptWithPublicKey = async (
  message: Uint8Array | string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  viemAuthSigner: Account,
): Promise<ThresholdMessageKit> => {
  // Create signer without provider (signing-only operation)
  const tacoSigner = await createTacoSigner(viemAuthSigner);

  // Use the existing ethers-based encryptWithPublicKey function with type assertions
  return await ethersEncryptWithPublicKey(
    message,
    condition,
    dkgPublicKey,
    tacoSigner as unknown as ethers.Signer,
  );
};

/**
 * Decrypts an encrypted message using viem clients.
 *
 * This is a viem-compatible overload of the decrypt function that accepts viem clients
 * instead of ethers providers.
 *
 * @export
 * @param {PublicClient} viemPublicClient - Viem PublicClient for network operations
 * @param {Domain} domain - Represents the logical network for decryption (must match ritualId)
 * @param {ThresholdMessageKit} messageKit - The kit containing the message to be decrypted
 * @param {ConditionContext} context - Optional context data used for decryption time values
 * @param {string[]} [porterUris] - Optional URI(s) for the Porter service
 *
 * @returns {Promise<Uint8Array>} Returns Promise that resolves with a decrypted message
 *
 * @throws {Error} If the active DKG Ritual cannot be retrieved or decryption process throws an error
 *
 * @example
 * ```typescript
 * import { createPublicClient, http } from 'viem';
 * import { polygonAmoy } from 'viem/chains';
 *
 * const viemPublicClient = createPublicClient({
 *   chain: polygonAmoy,
 *   transport: http()
 * });
 *
 * const decrypted = await decrypt(
 *   viemPublicClient,
 *   'lynx',
 *   messageKit,
 *   context
 * );
 *
 * ```
 */
export const decrypt = async (
  viemPublicClient: PublicClient,
  domain: Domain,
  messageKit: ThresholdMessageKit,
  context?: ConditionContext,
  porterUris?: string[],
): Promise<Uint8Array> => {
  // Create TACo provider adapter from viem object
  const tacoProvider = await createTacoProvider(viemPublicClient);

  // Use the existing ethers-based decrypt function with type assertion
  // Our adapter provides all the methods that the TACo SDK actually uses
  return await ethersDecrypt(
    tacoProvider as unknown as ethers.providers.Provider,
    domain,
    messageKit,
    context,
    porterUris,
  );
};
