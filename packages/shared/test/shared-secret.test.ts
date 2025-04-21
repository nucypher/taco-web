import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DecryptionError,
  DecryptionErrorCode,
  EncryptionError,
  EncryptionErrorCode,
} from '../src/encryption/errors';
import {
  decryptWithSharedSecret,
  encryptWithSharedSecret,
} from '../src/encryption/shared-secret';

// Mock the noble/hashes/utils randomBytes function
vi.mock('@noble/hashes/utils', () => {
  // Counter to ensure each call generates different values
  let counter = 0;
  return {
    randomBytes: (size: number) => {
      const bytes = new Uint8Array(size);
      // Fill with semi-random pattern based on counter
      for (let i = 0; i < size; i++) {
        bytes[i] = (i + counter) % 256;
      }
      counter++; // Increment counter for next call
      return bytes;
    },
  };
});

describe('Shared Secret Encryption/Decryption', () => {
  let sharedSecret: Uint8Array;
  let plaintext: Uint8Array;

  beforeEach(() => {
    // Create a deterministic shared secret for testing
    sharedSecret = new Uint8Array(32); // ChaCha20Poly1305 uses 32-byte keys
    for (let i = 0; i < 32; i++) {
      sharedSecret[i] = i;
    }

    // Create a simple plaintext for testing
    plaintext = new TextEncoder().encode(
      'This is a test message for encryption and decryption.',
    );
  });

  describe('encryptWithSharedSecret', () => {
    it('should encrypt plaintext successfully', () => {
      const encrypted = encryptWithSharedSecret(sharedSecret, plaintext);

      // Ensure the encrypted result is longer than the plaintext (nonce + ciphertext + authentication tag)
      expect(encrypted.length).toBeGreaterThan(plaintext.length);

      // Ensure the encrypted result is different from the plaintext
      expect(Buffer.from(encrypted).toString('hex')).not.toEqual(
        Buffer.from(plaintext).toString('hex'),
      );

      // Verify the nonce is included in the result (first 12 bytes)
      expect(encrypted.length).toBeGreaterThanOrEqual(12);
    });

    it('should produce different ciphertexts for the same plaintext due to random nonce', () => {
      const encrypted1 = encryptWithSharedSecret(sharedSecret, plaintext);
      const encrypted2 = encryptWithSharedSecret(sharedSecret, plaintext);

      // The ciphertexts should be different due to random nonces
      expect(Buffer.from(encrypted1).toString('hex')).not.toEqual(
        Buffer.from(encrypted2).toString('hex'),
      );
    });

    it('should handle empty plaintext', () => {
      const emptyPlaintext = new Uint8Array(0);
      const encrypted = encryptWithSharedSecret(sharedSecret, emptyPlaintext);

      // Result should at least contain the nonce (12 bytes) + authentication tag
      expect(encrypted.length).toBeGreaterThanOrEqual(12);
    });

    it('should throw EncryptionError on encryption failure', () => {
      // Mock a scenario that would cause encryption to fail
      // For this test, we'll use an invalid shared secret (too short)
      const invalidSecret = new Uint8Array(16); // Too short for ChaCha20Poly1305

      expect(() => encryptWithSharedSecret(invalidSecret, plaintext)).toThrow(
        EncryptionError,
      );
      try {
        encryptWithSharedSecret(invalidSecret, plaintext);
      } catch (error) {
        expect(error).toBeInstanceOf(EncryptionError);
        expect((error as EncryptionError).code).toBe(
          EncryptionErrorCode.PlaintextTooLarge,
        );
        expect((error as EncryptionError).message).toBe(
          'Plaintext is too large to encrypt',
        );
      }
    });
  });

  describe('decryptWithSharedSecret', () => {
    it('should decrypt ciphertext back to the original plaintext', () => {
      const encrypted = encryptWithSharedSecret(sharedSecret, plaintext);
      const decrypted = decryptWithSharedSecret(sharedSecret, encrypted);

      // The decrypted result should match the original plaintext
      expect(Buffer.from(decrypted).toString()).toEqual(
        Buffer.from(plaintext).toString(),
      );
    });

    it('should handle empty ciphertext appropriately', () => {
      const emptyCiphertext = new Uint8Array(0);

      // Should throw because ciphertext is too short (doesn't contain nonce)
      expect(() =>
        decryptWithSharedSecret(sharedSecret, emptyCiphertext),
      ).toThrow(DecryptionError);
    });

    it('should throw DecryptionError when ciphertext is too short', () => {
      const shortCiphertext = new Uint8Array(8); // Less than the nonce length (12)

      expect(() =>
        decryptWithSharedSecret(sharedSecret, shortCiphertext),
      ).toThrow(DecryptionError);
      try {
        decryptWithSharedSecret(sharedSecret, shortCiphertext);
      } catch (error) {
        expect(error).toBeInstanceOf(DecryptionError);
        expect((error as DecryptionError).code).toBe(
          DecryptionErrorCode.CiphertextTooShort,
        );
        expect((error as DecryptionError).message).toBe(
          'The ciphertext must include the nonce',
        );
      }
    });

    it('should throw DecryptionError on authentication failure', () => {
      // Encrypt the plaintext
      const encrypted = encryptWithSharedSecret(sharedSecret, plaintext);

      // Tamper with the ciphertext portion
      encrypted[20] = (encrypted[20] + 1) % 256; // Modify a byte

      // Decryption should fail due to authentication failure
      expect(() => decryptWithSharedSecret(sharedSecret, encrypted)).toThrow(
        DecryptionError,
      );
      try {
        decryptWithSharedSecret(sharedSecret, encrypted);
      } catch (error) {
        expect(error).toBeInstanceOf(DecryptionError);
        expect((error as DecryptionError).code).toBe(
          DecryptionErrorCode.AuthenticationFailed,
        );
        // Check that it contains the expected error message
        expect((error as DecryptionError).message).toContain(
          'Decryption of ciphertext failed',
        );
        expect((error as DecryptionError).message).toContain(
          'either someone tampered with the ciphertext or',
        );
        expect((error as DecryptionError).message).toContain(
          'you are using an incorrect decryption key',
        );
      }
    });

    it('should throw DecryptionError when using wrong shared secret', () => {
      // Encrypt with the correct shared secret
      const encrypted = encryptWithSharedSecret(sharedSecret, plaintext);

      // Create a different shared secret
      const wrongSecret = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        wrongSecret[i] = 31 - i;
      }

      // Decryption should fail with the wrong shared secret
      expect(() => decryptWithSharedSecret(wrongSecret, encrypted)).toThrow(
        DecryptionError,
      );
      try {
        decryptWithSharedSecret(wrongSecret, encrypted);
      } catch (error) {
        expect(error).toBeInstanceOf(DecryptionError);
        expect((error as DecryptionError).code).toBe(
          DecryptionErrorCode.AuthenticationFailed,
        );
      }
    });
  });

  describe('Integration of encryption and decryption', () => {
    it('should successfully roundtrip encryption/decryption with various data sizes', () => {
      // Test with different plaintext sizes
      const testSizes = [0, 1, 16, 64, 1024, 8192];

      for (const size of testSizes) {
        const testData = new Uint8Array(size);
        // Fill with some deterministic pattern
        for (let i = 0; i < size; i++) {
          testData[i] = i % 256;
        }

        const encrypted = encryptWithSharedSecret(sharedSecret, testData);
        const decrypted = decryptWithSharedSecret(sharedSecret, encrypted);

        // Verify the decrypted data matches the original
        expect(decrypted.length).toEqual(testData.length);
        for (let i = 0; i < size; i++) {
          expect(decrypted[i]).toEqual(testData[i]);
        }
      }
    });
  });
});
