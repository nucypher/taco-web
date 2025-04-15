import { x25519 } from '@noble/curves/ed25519';
import { describe, expect, it, vi } from 'vitest';
import {
  SessionSharedSecret,
  SessionStaticKey,
  SessionStaticSecret,
} from '../src/encryption/session-keys';

// Mock randomBytes to make tests deterministic
vi.mock('@noble/hashes/utils', () => {
  return {
    randomBytes: (size: number) => {
      const bytes = new Uint8Array(size);
      // Fill with deterministic pattern
      for (let i = 0; i < size; i++) {
        bytes[i] = i % 256;
      }
      return bytes;
    },
  };
});

describe('Session Keys', () => {
  describe('SessionStaticSecret', () => {
    it('should generate random keys', () => {
      const secret1 = SessionStaticSecret.random();
      const secret2 = SessionStaticSecret.random();

      // Keys should be Uint8Arrays
      expect(secret1).toBeInstanceOf(SessionStaticSecret);
      expect(secret2).toBeInstanceOf(SessionStaticSecret);

      // In a real scenario, random keys would be different
      // but since we've mocked randomBytes, they'll be the same
      // This is just checking that the function works
    });

    it('should derive public key correctly', () => {
      const secret = SessionStaticSecret.random();
      const publicKey = secret.publicKey();

      expect(publicKey).toBeInstanceOf(SessionStaticKey);

      // Verify the public key is derived correctly using noble's x25519
      // We can't directly access the private key, so we'll test by
      // creating a manual key and comparing the behavior

      const manualSecret = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        manualSecret[i] = i % 256;
      }

      const expectedPublicKey = x25519.getPublicKey(manualSecret);
      expect(publicKey.asBytes()).toEqual(expectedPublicKey);
    });

    it('should derive same shared secret when two parties exchange keys', () => {
      // Alice generates her keys
      const aliceSecret = SessionStaticSecret.random();
      const alicePublic = aliceSecret.publicKey();

      // Bob generates his keys
      const bobSecret = SessionStaticSecret.randomFromRng();
      const bobPublic = bobSecret.publicKey();

      // They exchange public keys and derive shared secrets
      const aliceSharedSecret = aliceSecret.deriveSharedSecret(bobPublic);
      const bobSharedSecret = bobSecret.deriveSharedSecret(alicePublic);

      // The shared secrets should be identical
      expect(aliceSharedSecret.asBytes()).toEqual(bobSharedSecret.asBytes());

      // Verify they're both instances of SessionSharedSecret
      expect(aliceSharedSecret).toBeInstanceOf(SessionSharedSecret);
      expect(bobSharedSecret).toBeInstanceOf(SessionSharedSecret);
    });

    it('should support creating keys from custom RNG', () => {
      const customRng = {
        randomBytes: (size: number) => {
          const bytes = new Uint8Array(size);
          // Fill with a different pattern for testing
          for (let i = 0; i < size; i++) {
            bytes[i] = (i + 42) % 256;
          }
          return bytes;
        },
      };

      const secret = SessionStaticSecret.randomFromRng(customRng);
      expect(secret).toBeInstanceOf(SessionStaticSecret);

      // Verify the public key is derived using our custom RNG
      const publicKey = secret.publicKey();

      // Create expected key directly for verification
      const expectedSecretBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        expectedSecretBytes[i] = (i + 42) % 256;
      }
      const expectedPublicKey = x25519.getPublicKey(expectedSecretBytes);

      expect(publicKey.asBytes()).toEqual(expectedPublicKey);
    });
  });

  describe('SessionStaticKey', () => {
    it('should store and return public key bytes correctly', () => {
      const publicKeyBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        publicKeyBytes[i] = i + 10;
      }

      const publicKey = new SessionStaticKey(publicKeyBytes);
      expect(publicKey.asBytes()).toEqual(publicKeyBytes);
      expect(publicKey.asBytes()).not.toBe(publicKeyBytes); // Should be a copy
    });
  });

  describe('SessionSharedSecret', () => {
    it('should store and return shared secret bytes correctly', () => {
      const sharedSecretBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        sharedSecretBytes[i] = i + 20;
      }

      const sharedSecret = new SessionSharedSecret(sharedSecretBytes);
      expect(sharedSecret.asBytes()).toEqual(sharedSecretBytes);
      expect(sharedSecret.asBytes()).not.toBe(sharedSecretBytes); // Should be a copy
    });
  });

  describe('End-to-End Key Exchange', () => {
    it('should perform complete key exchange between multiple parties', () => {
      // Create three parties with manually created distinct keys
      // instead of relying on the mocked randomBytes which returns the same values

      // Create Alice's key - [1, 2, 3, ...]
      const aliceSecretBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        aliceSecretBytes[i] = i + 1;
      }
      const alice = new SessionStaticSecret(aliceSecretBytes);

      // Create Bob's key - [10, 11, 12, ...]
      const bobSecretBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        bobSecretBytes[i] = i + 10;
      }
      const bob = new SessionStaticSecret(bobSecretBytes);

      // Create Charlie's key - [20, 21, 22, ...]
      const charlieSecretBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        charlieSecretBytes[i] = i + 20;
      }
      const charlie = new SessionStaticSecret(charlieSecretBytes);

      // Exchange public keys
      const alicePublic = alice.publicKey();
      const bobPublic = bob.publicKey();
      const charliePublic = charlie.publicKey();

      // Each party derives shared secrets with the other two
      const aliceBobSecret = alice.deriveSharedSecret(bobPublic);
      const bobAliceSecret = bob.deriveSharedSecret(alicePublic);

      const aliceCharlieSecret = alice.deriveSharedSecret(charliePublic);
      const charlieAliceSecret = charlie.deriveSharedSecret(alicePublic);

      const bobCharlieSecret = bob.deriveSharedSecret(charliePublic);
      const charlieBobSecret = charlie.deriveSharedSecret(bobPublic);

      // Verify that both parties in each pair derive the same shared secret
      expect(aliceBobSecret.asBytes()).toEqual(bobAliceSecret.asBytes());
      expect(aliceCharlieSecret.asBytes()).toEqual(
        charlieAliceSecret.asBytes(),
      );
      expect(bobCharlieSecret.asBytes()).toEqual(charlieBobSecret.asBytes());

      // Verify that different pairs have different shared secrets
      expect(aliceBobSecret.asBytes()).not.toEqual(
        aliceCharlieSecret.asBytes(),
      );
      expect(aliceBobSecret.asBytes()).not.toEqual(bobCharlieSecret.asBytes());
      expect(aliceCharlieSecret.asBytes()).not.toEqual(
        bobCharlieSecret.asBytes(),
      );
    });
  });
});
