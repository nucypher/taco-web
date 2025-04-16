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
      fixedNonce: vector.fixed_nonce
        ? new Uint8Array(vector.fixed_nonce)
        : undefined,
      expectedCiphertext: Buffer.from(vector.expected_ciphertext, 'hex'), // new Uint8Array(vector.expected_ciphertext)
    };
  };

  // Parse all test vectors into usable formats
  const testVectors = test_vectors.map(prepareTestVector);

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

  describe('Vector-based compatibility tests', () => {
    it.each(testVectors)(
      'should correctly encrypt and decrypt test vector $id: $description',
      (vector) => {
        const { sharedSecret, plaintext, fixedNonce, expectedCiphertext } =
          vector;

        if (fixedNonce && sharedSecret) {
          // Set up our mock to return the fixed nonce
          const cleanupMock = setupFixedNonceMock(fixedNonce);

          // Encrypt with fixed nonce
          const ciphertext = encryptWithSharedSecret(sharedSecret, plaintext);
          // Always restore the original implementation
          cleanupMock();

          // Check against expected ciphertext from the JSON file
          const ciphertextHex = Buffer.from(ciphertext).toString('hex');
          const expectedHex = Buffer.from(expectedCiphertext).toString('hex');
          expect(ciphertextHex).toEqual(expectedHex);
        }

        // Verify decryption works correctly
        const decrypted = decryptWithSharedSecret(
          sharedSecret,
          expectedCiphertext,
        );

        expect(Buffer.from(decrypted).toString()).toEqual(
          Buffer.from(plaintext).toString(),
        );
      },
    );
  });

  describe('Error handling compatibility tests', () => {
    // Using the first test vector's shared secret for error tests
    const { sharedSecret, plaintext } = testVectors[0];

    it('should handle ciphertext too short error in the same way as Rust', () => {
      const tooShortCiphertext = new Uint8Array([0x01, 0x02, 0x03]); // Less than nonce length

      try {
        decryptWithSharedSecret(sharedSecret, tooShortCiphertext);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DecryptionError);
        const decryptionError = error as DecryptionError;
        expect(decryptionError.code).toBe(
          DecryptionErrorCode.CiphertextTooShort,
        );
        expect(decryptionError.message).toContain(
          'The ciphertext must include the nonce',
        );
      }
    });

    it('should handle tampered ciphertext in the same way as Rust', () => {
      // We need to setup a fixed nonce for the encryption
      const mockNonce = new Uint8Array(12).fill(0); // 12 zeros as nonce

      // Use the existing helper to setup the mock
      const cleanupMock = setupFixedNonceMock(mockNonce);

      try {
        // Encrypt normally
        const ciphertext = encryptWithSharedSecret(sharedSecret, plaintext);

        // Tamper with the ciphertext by changing one byte
        const tamperedCiphertext = new Uint8Array(ciphertext);
        tamperedCiphertext[tamperedCiphertext.length - 1] ^= 0x01; // Flip one bit in the last byte

        try {
          decryptWithSharedSecret(sharedSecret, tamperedCiphertext);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).toBeInstanceOf(DecryptionError);
          const decryptionError = error as DecryptionError;
          expect(decryptionError.code).toBe(
            DecryptionErrorCode.AuthenticationFailed,
          );
          expect(decryptionError.message).toContain(
            'Decryption of ciphertext failed',
          );
        }
      } finally {
        // Always restore the original implementation
        cleanupMock();
      }
    });
  });
});
