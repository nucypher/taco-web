import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/hashes/utils';

import {
  DecryptionError,
  DecryptionErrorCode,
  EncryptionError,
  EncryptionErrorCode,
} from './errors';

export function encryptWithSharedSecret(
  sharedSecret: Uint8Array,
  plaintext: Uint8Array,
): Uint8Array {
  const nonce = randomBytes(12); // Generate a 12-byte nonce
  const cipher = chacha20poly1305(sharedSecret, nonce); // Use an object with key
  try {
    const ciphertext = cipher.encrypt(plaintext);
    const result = new Uint8Array(nonce.length + ciphertext.length);
    result.set(nonce);
    result.set(ciphertext, nonce.length);
    return result;
  } catch (error) {
    throw new EncryptionError(EncryptionErrorCode.PlaintextTooLarge);
  }
}

export function decryptWithSharedSecret(
  sharedSecret: Uint8Array,
  ciphertext: Uint8Array,
): Uint8Array {
  const nonceLength = 12; // ChaCha20Poly1305 uses a 12-byte nonce
  if (ciphertext.length < nonceLength) {
    throw new DecryptionError(DecryptionErrorCode.CiphertextTooShort);
  }
  const nonce = ciphertext.slice(0, nonceLength);
  const encryptedData = ciphertext.slice(nonceLength);
  const cipher = chacha20poly1305(sharedSecret, nonce); // Use an object with key
  try {
    return cipher.decrypt(encryptedData);
  } catch (error) {
    throw new DecryptionError(DecryptionErrorCode.AuthenticationFailed);
  }
}
