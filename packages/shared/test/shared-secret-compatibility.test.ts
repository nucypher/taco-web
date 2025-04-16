import { describe, expect, it, vi } from 'vitest';
import { DecryptionError, DecryptionErrorCode } from '../src/encryption/errors';
import testVectorsFile from './fixtures/shared-secret-vectors.json';

// Mock the randomBytes function from @noble/hashes/utils
// This must be done before importing any modules that use it
vi.mock('@noble/hashes/utils', () => {
  return {
    // Return a function that will be replaced in each test
    randomBytes: vi.fn().mockImplementation((bytesLength?: number) => {
      return new Uint8Array(bytesLength || 32);
    }),
  };
});

// Now import modules that depend on the mocked randomBytes
import { randomBytes } from '@noble/hashes/utils';
import {
  decryptWithSharedSecret,
  encryptWithSharedSecret,
} from '../src/encryption/shared-secret';

/**
 * This test file contains fixed test vectors to verify compatibility
 * between the TypeScript implementation and the original Rust implementation.
 *
 * Test vectors are loaded from a JSON file which makes it easier to:
 * 1. Share vectors between different implementations (Rust, TypeScript)
 * 2. Update or add vectors without changing test logic
 * 3. Maintain expected inputs/outputs separately from test code
 */
describe('Shared Secret Compatibility Tests', () => {
  // Parse test vectors from the loaded JSON file
  const { test_vectors } = testVectorsFile as { test_vectors: any[] };

  // Helper to convert test vector from JSON to usable objects
  const prepareTestVector = (vector: any) => {
    return {
      id: vector.id,
      description: vector.description,
      sharedSecret: new Uint8Array(vector.shared_secret),
      plaintext: vector.plaintext
        ? new TextEncoder().encode(vector.plaintext)
        : new Uint8Array(0),
      fixedNonce: new Uint8Array(vector.fixed_nonce),
      expectedCiphertext: vector.expected_ciphertext
        ? Buffer.from(vector.expected_ciphertext, 'hex')
        : null,
      rustGeneratedCiphertext: vector.rust_generated_ciphertext
        ? new Uint8Array(vector.rust_generated_ciphertext)
        : null,
      expectedPlaintext: vector.expected_plaintext,
    };
  };

  // Parse test vectors into usable formats
  const testVector1 = prepareTestVector(test_vectors[0]);
  const testVector2 = prepareTestVector(test_vectors[1]);
  const rustCompatVector = prepareTestVector(test_vectors[2]);

  // Set up a fixed nonce for testing
  function setupFixedNonceMock(fixedNonce: Uint8Array) {
    // Get the mocked function
    const mockedRandomBytes = vi.mocked(randomBytes);

    // Clear previous implementations
    mockedRandomBytes.mockReset();

    // Configure it to return our fixed nonce
    mockedRandomBytes.mockImplementation((bytesLength?: number) => {
      // If length is undefined or matches our nonce length, return the fixed nonce
      // Otherwise return a new array of the requested length
      if (bytesLength === undefined || bytesLength === fixedNonce.length) {
        return fixedNonce;
      } else {
        return new Uint8Array(bytesLength);
      }
    });

    // Return a cleanup function
    return () => {
      mockedRandomBytes.mockReset();
    };
  }

  describe('Round-trip fixed vector tests', () => {
    // Testing each vector for round-trip compatibility
    it('should correctly encrypt and decrypt test vector 1', () => {
      const { sharedSecret, plaintext, fixedNonce, expectedCiphertext } =
        testVector1;

      // Set up our mock to return the fixed nonce
      const cleanupMock = setupFixedNonceMock(fixedNonce);

      try {
        // Encrypt with fixed nonce
        const ciphertext = encryptWithSharedSecret(sharedSecret, plaintext);

        // Check against expected ciphertext from the JSON file
        const ciphertextHex = Buffer.from(ciphertext).toString('hex');
        const expectedHex = Buffer.from(expectedCiphertext!).toString('hex');
        expect(ciphertextHex).toEqual(expectedHex);

        // Verify decryption works correctly
        const decrypted = decryptWithSharedSecret(sharedSecret, ciphertext);
        expect(Buffer.from(decrypted).toString()).toEqual(
          Buffer.from(plaintext).toString(),
        );
      } finally {
        // Always restore the original implementation
        cleanupMock();
      }
    });

    it('should correctly encrypt and decrypt test vector 2 (empty plaintext)', () => {
      const { sharedSecret, plaintext, fixedNonce, expectedCiphertext } =
        testVector2;

      // Set up our mock to return the fixed nonce
      const cleanupMock = setupFixedNonceMock(fixedNonce);

      try {
        // Encrypt with fixed nonce
        const ciphertext = encryptWithSharedSecret(sharedSecret, plaintext);

        // Check against expected ciphertext from the JSON file
        const ciphertextHex = Buffer.from(ciphertext).toString('hex');
        const expectedHex = Buffer.from(expectedCiphertext!).toString('hex');
        expect(ciphertextHex).toEqual(expectedHex);

        // Verify decryption works correctly
        const decrypted = decryptWithSharedSecret(sharedSecret, ciphertext);
        expect(decrypted.length).toEqual(plaintext.length);
        expect(decrypted.byteLength).toEqual(0); // Empty plaintext
      } finally {
        // Always restore the original implementation
        cleanupMock();
      }
    });
  });

  describe('Cross-implementation compatibility tests', () => {
    // Compatibility test for decryption of pre-generated ciphertext from Rust
    it('should correctly decrypt ciphertext generated by the Rust implementation', () => {
      // Using test vector with Rust-generated ciphertext from the JSON file
      const { sharedSecret, rustGeneratedCiphertext, expectedPlaintext } =
        rustCompatVector;

      // Skip if no Rust-generated ciphertext data is available
      if (!rustGeneratedCiphertext) {
        throw Error('No Rust-generated ciphertext provided - skipping test');
      }

      try {
        const decrypted = decryptWithSharedSecret(
          sharedSecret,
          rustGeneratedCiphertext,
        );
        const decryptedText = Buffer.from(decrypted).toString();

        if (
          expectedPlaintext &&
          expectedPlaintext !== 'Replace with actual plaintext from Rust'
        ) {
          expect(decryptedText).toEqual(expectedPlaintext);
          console.debug('✓ Successfully decrypted Rust-generated ciphertext');
        } else {
          console.error('Decrypted Rust-generated ciphertext:', decryptedText);
          throw Error(
            'Update the test vector with expected plaintext to enable validation',
          );
        }
      } catch (error) {
        if (rustGeneratedCiphertext.length <= 12) {
          throw Error(
            'Ciphertext too short - update with real Rust-generated data',
          );
        } else if (
          error instanceof DecryptionError &&
          error.code === DecryptionErrorCode.AuthenticationFailed
        ) {
          throw Error(
            'Authentication failed - update with real Rust-generated data',
          );
        } else {
          throw error;
        }
      }
    });
  });

  describe('Error handling compatibility tests', () => {
    it('should handle ciphertext too short error in the same way as Rust', () => {
      const { sharedSecret } = testVector1;
      const tooShortCiphertext = new Uint8Array([0x01, 0x02, 0x03]); // Less than nonce length

      try {
        decryptWithSharedSecret(sharedSecret, tooShortCiphertext);
        expect.fail('Should have thrown an error');
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

    it('should handle authentication failed error in the same way as Rust', () => {
      const { sharedSecret, fixedNonce } = testVector1;

      // Set up our mock to return the fixed nonce
      const cleanupMock = setupFixedNonceMock(fixedNonce);

      try {
        // Generate valid ciphertext
        const validCiphertext = encryptWithSharedSecret(
          sharedSecret,
          new TextEncoder().encode('Test message'),
        );

        // Tamper with the ciphertext
        validCiphertext[validCiphertext.length - 1] =
          (validCiphertext[validCiphertext.length - 1] + 1) % 256;

        // Try to decrypt tampered ciphertext
        decryptWithSharedSecret(sharedSecret, validCiphertext);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DecryptionError);
        expect((error as DecryptionError).code).toBe(
          DecryptionErrorCode.AuthenticationFailed,
        );
        expect((error as DecryptionError).message).toContain(
          'Decryption of ciphertext failed',
        );
      } finally {
        // Always restore the original implementation
        cleanupMock();
      }
    });
  });
});
