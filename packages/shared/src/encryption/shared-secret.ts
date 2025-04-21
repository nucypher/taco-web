import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/hashes/utils';

import {
  DecryptionError,
  DecryptionErrorCode,
  EncryptionError,
  EncryptionErrorCode,
} from './errors';

export const CHACHA20POLY1305_NONCE_LENGTH = 12; // bytes

export function encryptWithSharedSecret(
  sharedSecret: Uint8Array,
  plaintext: Uint8Array,
): Uint8Array {
  const nonce = randomBytes(CHACHA20POLY1305_NONCE_LENGTH); // Generate a 12-byte nonce
  const cipher = chacha20poly1305(sharedSecret, nonce); // Use an object with key
  try {
    const ciphertext = cipher.encrypt(plaintext);
    const result = new Uint8Array(
      CHACHA20POLY1305_NONCE_LENGTH + ciphertext.length,
    );
    result.set(nonce);
    result.set(ciphertext, CHACHA20POLY1305_NONCE_LENGTH);
    return result;
  } catch (error) {
    throw new EncryptionError(EncryptionErrorCode.PlaintextTooLarge);
  }
}

export function decryptWithSharedSecret(
  sharedSecret: Uint8Array,
  ciphertext: Uint8Array,
): Uint8Array {
  if (ciphertext.length < CHACHA20POLY1305_NONCE_LENGTH) {
    throw new DecryptionError(DecryptionErrorCode.CiphertextTooShort);
  }
  const nonce = ciphertext.slice(0, CHACHA20POLY1305_NONCE_LENGTH);
  const encryptedData = ciphertext.slice(CHACHA20POLY1305_NONCE_LENGTH);
  const cipher = chacha20poly1305(sharedSecret, nonce); // Use an object with key
  try {
    return cipher.decrypt(encryptedData);
  } catch (error) {
    throw new DecryptionError(DecryptionErrorCode.AuthenticationFailed);
  }
}
