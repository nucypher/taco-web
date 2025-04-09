import { describe, expect, it } from 'vitest';
import { DecryptionError, DecryptionErrorCode } from '../src/encryption/errors';
import {
  decryptWithSharedSecret,
  encryptWithSharedSecret,
} from '../src/encryption/shared-secret';
import testVectorsFile from './fixtures/shared-secret-vectors.json';

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
  const { testVectors } = testVectorsFile as { testVectors: any[] };

  // Helper to convert test vector from JSON to usable objects
  const prepareTestVector = (vector: any) => {
    return {
      id: vector.id,
      description: vector.description,
      sharedSecret: new Uint8Array(vector.sharedSecret),
      plaintext: vector.plaintext
        ? new TextEncoder().encode(vector.plaintext)
        : new Uint8Array(0),
      fixedNonce: new Uint8Array(vector.fixedNonce),
      expectedCiphertext: vector.expectedCiphertext
        ? Buffer.from(vector.expectedCiphertext, 'hex')
        : null,
      rustGeneratedCiphertext: vector.rustGeneratedCiphertext
        ? new Uint8Array(vector.rustGeneratedCiphertext)
        : null,
      expectedPlaintext: vector.expectedPlaintext,
    };
  };

  // Parse test vectors into usable formats
  const testVector1 = prepareTestVector(testVectors[0]);
  const testVector2 = prepareTestVector(testVectors[1]);
  const rustCompatVector = prepareTestVector(testVectors[2]);

  // Mock implementation for fixed nonce tests
  const setupFixedNonceMock = (fixedNonce: Uint8Array) => {
    // Save the original implementation
    const originalRandomBytes = globalThis.crypto.getRandomValues;

    // Override with our fixed nonce for deterministic encryption
    globalThis.crypto.getRandomValues = (<T extends ArrayBufferView | null>(
      array: T,
    ): T => {
      if (array && array.byteLength === fixedNonce.length) {
        // Safe to type assert since we're checking the byteLength matches
        const typedArray = array as unknown as Uint8Array;
        typedArray.set(fixedNonce);
      }
      return array;
    }) as typeof globalThis.crypto.getRandomValues;

    return () => {
      // Restore the original implementation
      globalThis.crypto.getRandomValues = originalRandomBytes;
    };
  };

  describe('Round-trip fixed vector tests', () => {
    // Testing each vector for round-trip compatibility
    it('should correctly encrypt and decrypt test vector 1', () => {
      const { sharedSecret, plaintext, fixedNonce, expectedCiphertext } =
        testVector1;

      // Setup mock for deterministic output
      const cleanupMock = setupFixedNonceMock(fixedNonce);

      try {
        // Encrypt with fixed nonce
        const ciphertext = encryptWithSharedSecret(sharedSecret, plaintext);

        // Check against expected ciphertext from the JSON file
        const ciphertextHex = Buffer.from(ciphertext).toString('hex');
        if (expectedCiphertext) {
          const expectedHex = Buffer.from(expectedCiphertext).toString('hex');
          expect(ciphertextHex).toEqual(expectedHex);
          console.debug(
            `✓ Vector ${testVector1.id} ciphertext matches expected output`,
          );
        } else {
          console.error(
            `Generated ciphertext for vector ${testVector1.id}:`,
            ciphertextHex,
          );
          console.error(
            'Add this to the test vectors JSON file to enable validation',
          );
        }

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

      // Setup mock for deterministic output
      const cleanupMock = setupFixedNonceMock(fixedNonce);

      try {
        // Encrypt with fixed nonce
        const ciphertext = encryptWithSharedSecret(sharedSecret, plaintext);

        // Check against expected ciphertext from the JSON file
        const ciphertextHex = Buffer.from(ciphertext).toString('hex');
        if (expectedCiphertext) {
          const expectedHex = Buffer.from(expectedCiphertext).toString('hex');
          expect(ciphertextHex).toEqual(expectedHex);
          console.debug(
            `✓ Vector ${testVector2.id} ciphertext matches expected output`,
          );
        } else {
          console.error(
            `Generated ciphertext for vector ${testVector2.id}:`,
            ciphertextHex,
          );
          throw Error(
            'Add this to the test vectors JSON file to enable validation',
          );
        }

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

      // Setup mock for deterministic output
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
