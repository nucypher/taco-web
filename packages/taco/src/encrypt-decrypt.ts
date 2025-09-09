import { DkgPublicKey, ThresholdMessageKit } from '@nucypher/nucypher-core';
import {
  Account,
  type Domain,
  isViemAccount,
  isViemClient,
  PublicClient,
} from '@nucypher/shared';
import { ethers } from 'ethers';

import { Condition } from './conditions/condition';
import { ConditionContext } from './conditions/context';
import {
  decrypt as ethersDecrypt,
  encrypt as ethersEncrypt,
  encryptWithPublicKey as ethersEncryptWithPublicKey,
} from './taco';
import {
  decrypt as viemDecrypt,
  encrypt as viemEncrypt,
  encryptWithPublicKey as viemEncryptWithPublicKey,
} from './viem-taco';

// Function overloads for encrypt
export function encrypt(
  provider: ethers.providers.Provider,
  domain: Domain,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
  authSigner: ethers.Signer,
): Promise<ThresholdMessageKit>;

export function encrypt(
  viemPublicClient: PublicClient,
  domain: Domain,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
  viemAuthSigner: Account,
): Promise<ThresholdMessageKit>;

// Implementation that routes to the appropriate function
export async function encrypt(
  providerOrClient: ethers.providers.Provider | PublicClient,
  domain: Domain,
  message: Uint8Array | string,
  condition: Condition,
  ritualId: number,
  signerOrAccount: ethers.Signer | Account,
): Promise<ThresholdMessageKit> {
  // Type guard to determine if we're using viem or ethers
  if (isViemClient(providerOrClient) && isViemAccount(signerOrAccount)) {
    return viemEncrypt(
      providerOrClient as PublicClient,
      domain,
      message,
      condition,
      ritualId,
      signerOrAccount as Account,
    );
  } else {
    return ethersEncrypt(
      providerOrClient as ethers.providers.Provider,
      domain,
      message,
      condition,
      ritualId,
      signerOrAccount as ethers.Signer,
    );
  }
}

// Function overloads for encryptWithPublicKey
export function encryptWithPublicKey(
  message: Uint8Array | string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  authSigner: ethers.Signer,
): Promise<ThresholdMessageKit>;

export function encryptWithPublicKey(
  message: Uint8Array | string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  viemAuthSigner: Account,
): Promise<ThresholdMessageKit>;

/**
 * Encrypts a message with the given DKG public key under a specified condition.
 * Supports both ethers.js and viem signers for maximum flexibility.
 *
 * Note: This function can be used offline since it doesn't require network access to fetch
 * the DKG public key (unlike the `encrypt` function which fetches it from the ritual).
 *
 * @export
 * @param {Uint8Array | string} message - The message to be encrypted.
 * @param {Condition} condition - Condition under which the message will be encrypted. Those conditions must be
 * satisfied in order to decrypt the message.
 * @param {DkgPublicKey} dkgPublicKey - The public key of an active DKG Ritual to be used for encryption.
 * @param {ethers.Signer | Account} signerOrAccount - The signer that will be used to sign the encrypter authorization.
 * Can be either an ethers.js Signer or a viem Account object.
 *
 * @returns {Promise<ThresholdMessageKit>} Returns Promise that resolves with an instance of ThresholdMessageKit.
 * It represents the encrypted message.
 *
 * @throws {Error} If the encryption process throws an error, an error is thrown.
 */
// Implementation that routes to the appropriate function
export async function encryptWithPublicKey(
  message: Uint8Array | string,
  condition: Condition,
  dkgPublicKey: DkgPublicKey,
  signerOrAccount: ethers.Signer | Account,
): Promise<ThresholdMessageKit> {
  // Type guard to determine if we're using viem or ethers
  if (isViemAccount(signerOrAccount)) {
    return viemEncryptWithPublicKey(
      message,
      condition,
      dkgPublicKey,
      signerOrAccount as Account,
    );
  } else {
    return ethersEncryptWithPublicKey(
      message,
      condition,
      dkgPublicKey,
      signerOrAccount as ethers.Signer,
    );
  }
}

// Function overloads for decrypt
export function decrypt(
  provider: ethers.providers.Provider,
  domain: Domain,
  messageKit: ThresholdMessageKit,
  context?: ConditionContext,
  porterUris?: string[],
): Promise<Uint8Array>;

export function decrypt(
  viemPublicClient: PublicClient,
  domain: Domain,
  messageKit: ThresholdMessageKit,
  context?: ConditionContext,
  porterUris?: string[],
): Promise<Uint8Array>;

// Implementation that routes to the appropriate function
export async function decrypt(
  providerOrClient: ethers.providers.Provider | PublicClient,
  domain: Domain,
  messageKit: ThresholdMessageKit,
  context?: ConditionContext,
  porterUris?: string[],
): Promise<Uint8Array> {
  // Type guard to determine if we're using viem or ethers
  if (isViemClient(providerOrClient)) {
    return viemDecrypt(
      providerOrClient as PublicClient,
      domain,
      messageKit,
      context,
      porterUris,
    );
  } else {
    return ethersDecrypt(
      providerOrClient as ethers.providers.Provider,
      domain,
      messageKit,
      context,
      porterUris,
    );
  }
}
