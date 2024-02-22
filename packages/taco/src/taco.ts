import {
  AccessControlPolicy,
  DkgPublicKey,
  encryptForDkg,
  ThresholdMessageKit,
} from '@nucypher/nucypher-core';
import {
  ChecksumAddress,
  DkgCoordinatorAgent,
  Domain,
  fromHexString,
  getPorterUri,
  GlobalAllowListAgent,
  toBytes,
} from '@nucypher/shared';
import { ethers } from 'ethers';
import { keccak256 } from 'ethers/lib/utils';

import { Condition } from './conditions/condition';
import { ConditionExpression } from './conditions/condition-expr';
import { CustomContextParam } from './conditions/context';
import { DkgClient } from './dkg';
import { retrieveAndDecrypt } from './tdec';

/**
 * Encrypts a message under given conditions using a public key from an active DKG ritual.
 *
 * @export
 * @param {ethers.providers.Provider} provider - Instance of ethers provider which is used to interact with
 * your selected network.
 * @param {Domain} domain - Represents the logical network in which the encryption will be performed.
 * Must match the `ritualId`.
 * @param {Uint8Array | string} message  - The message to be encrypted.
 * @param {Condition} condition - Condition under which the message will be encrypted. Those conditions must be
 * satisfied in order to decrypt the message.
 * @param {number} ritualId - The ID of the DKG Ritual to be used for encryption. The message will be encrypted
 * under the public key of this ritual.
 * @param {ethers.Signer} authSigner - The signer that will be used to sign the encrypter authorization.
 *
 * @returns {Promise<ThresholdMessageKit>} Returns Promise that resolves with an instance of ThresholdMessageKit.
 * It represents the encrypted message.
 *
 * @throws {Error} If the active DKG Ritual cannot be retrieved an error is thrown.
 */
export const encrypt = async (
  provider: ethers.providers.Provider,
  domain: Domain,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
  authSigner: ethers.Signer,
): Promise<ThresholdMessageKit> => {
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
  const dkgRitual = await DkgClient.getActiveRitual(provider, domain, ritualId);

  return await encryptWithPublicKey(
    message,
    condition,
    dkgRitual.dkgPublicKey,
    authSigner,
  );
};

/**
 * Encrypts a message with the given DKG public key under a specified condition.
 *
 * @export
 * @param {Uint8Array | string} message  - The message to be encrypted.
 * @param {Condition} condition - Condition under which the message will be encrypted. Those conditions must be
 * satisfied in order to decrypt the message.
 * @param {DkgPublicKey} dkgPublicKey - The public key of an active DKG Ritual to be used for encryption
 * @param {ethers.Signer} authSigner - The signer that will be used to sign the encrypter authorization.
 *
 * @returns {Promise<ThresholdMessageKit>} Returns Promise that resolves with an instance of ThresholdMessageKit.
 * It represents the encrypted message.
 *
 * @throws {Error} If the encryption process throws an error, an error is thrown.
 */
export const encryptWithPublicKey = async (
  message: Uint8Array | string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  authSigner: ethers.Signer,
): Promise<ThresholdMessageKit> => {
  if (typeof message === 'string') {
    message = toBytes(message);
  }

  const conditionExpr = new ConditionExpression(condition);

  const [ciphertext, authenticatedData] = encryptForDkg(
    message,
    dkgPublicKey,
    conditionExpr.toWASMConditions(),
  );

  const headerHash = keccak256(ciphertext.header.toBytes());
  const authorization = await authSigner.signMessage(fromHexString(headerHash));
  const acp = new AccessControlPolicy(
    authenticatedData,
    fromHexString(authorization),
  );

  return new ThresholdMessageKit(ciphertext, acp);
};

/**
 * Decrypts an encrypted message.
 *
 * @export
 * @param {ethers.providers.Provider} provider - Instance of ethers provider which is used to interact with
 * your selected network.
 * @param {Domain} domain - Represents the logical network in which the decryption will be performed.
 * Must match the `ritualId`.
 * @param {ThresholdMessageKit} messageKit - The kit containing the message to be decrypted
 * @param {string} [porterUri] - The URI for the Porter service. If not provided, a value will be obtained
 * from the Domain
 * @param {ethers.Signer} [signer] - An optional signer for the decryption
 * @param {Record<string, CustomContextParam>} [customParameters] - Optional custom parameters that may be required
 * depending on the condition used
 *
 * @returns {Promise<Uint8Array>} Returns Promise that resolves with a decrypted message
 *
 * @throws {Error} If the active DKG Ritual cannot be retrieved or decryption process throws an error,
 * an error is thrown.
 */
export const decrypt = async (
  provider: ethers.providers.Provider,
  domain: Domain,
  messageKit: ThresholdMessageKit,
  porterUri?: string,
  signer?: ethers.Signer,
  customParameters?: Record<string, CustomContextParam>,
): Promise<Uint8Array> => {
  if (!porterUri) {
    porterUri = getPorterUri(domain);
  }

  const ritualId = await DkgCoordinatorAgent.getRitualIdFromPublicKey(
    provider,
    domain,
    messageKit.acp.publicKey,
  );
  const ritual = await DkgClient.getActiveRitual(provider, domain, ritualId);
  return retrieveAndDecrypt(
    provider,
    domain,
    porterUri,
    messageKit,
    ritualId,
    ritual.sharesNum,
    ritual.threshold,
    signer,
    customParameters,
  );
};

/**
 * Checks if the encryption from the provided messageKit is authorized for the specified ritual.
 *
 * @export
 * @param {ethers.providers.Provider} provider - Instance of ethers provider which is used to interact with
 * your selected network.
 * @param {Domain} domain - The domain which was used to encrypt the network. Must match the `ritualId`.
 * @param {ThresholdMessageKit} messageKit - The encrypted message kit to be checked.
 * @param {number} ritualId - The ID of the DKG Ritual under which the messageKit was supposedly encrypted.
 *
 * @returns {Promise<boolean>} Returns a Promise that resolves with the authorization status.
 * True if authorized, false otherwise
 */
export const isAuthorized = async (
  provider: ethers.providers.Provider,
  domain: Domain,
  messageKit: ThresholdMessageKit,
  ritualId: number,
) =>
  DkgCoordinatorAgent.isEncryptionAuthorized(
    provider,
    domain,
    ritualId,
    messageKit,
  );

export const registerEncrypters = async (
  provider: ethers.providers.Provider,
  signer: ethers.Signer,
  domain: Domain,
  ritualId: number,
  encrypters: ChecksumAddress[],
): Promise<void> => {
  await GlobalAllowListAgent.registerEncrypters(
    provider,
    signer,
    domain,
    ritualId,
    encrypters,
  );
};
