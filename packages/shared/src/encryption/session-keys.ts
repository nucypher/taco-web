import { x25519 } from '@noble/curves/ed25519';
import { randomBytes } from '@noble/hashes/utils';

/**
 * Represents a static secret key for a session
 * Port of the Rust SessionStaticSecret implementation
 */
export class SessionStaticSecret {
  private readonly secretKey: Uint8Array;

  constructor(secretKey: Uint8Array) {
    this.secretKey = secretKey;
  }

  /**
   * Perform Diffie-Hellman key exchange to derive a shared secret
   * @param theirPublicKey The public key to derive a shared secret with
   * @returns The derived shared secret
   */
  deriveSharedSecret(theirPublicKey: SessionStaticKey): SessionSharedSecret {
    // Use the noble/curves implementation of X25519 DH
    const sharedSecret = x25519.getSharedSecret(
      this.secretKey,
      theirPublicKey.asBytes(),
    );
    return new SessionSharedSecret(sharedSecret);
  }

  /**
   * Create a secret key from a secure random number generator
   * @returns A new SessionStaticSecret
   */
  static randomFromRng(csprng?: {
    randomBytes: (n: number) => Uint8Array;
  }): SessionStaticSecret {
    // If no custom RNG is provided, use the default randomBytes
    const secretKey = csprng ? csprng.randomBytes(32) : randomBytes(32); // X25519 uses 32-byte keys
    return new SessionStaticSecret(secretKey);
  }

  /**
   * Create a random secret key using the default RNG
   * @returns A new SessionStaticSecret
   */
  static random(): SessionStaticSecret {
    return SessionStaticSecret.randomFromRng();
  }

  /**
   * Returns a public key corresponding to this secret key
   * @returns The public key
   */
  publicKey(): SessionStaticKey {
    const publicKey = x25519.getPublicKey(this.secretKey);
    return new SessionStaticKey(publicKey);
  }
}

/**
 * Represents a public key for a session
 */
export class SessionStaticKey {
  private readonly publicKey: Uint8Array;

  constructor(publicKey: Uint8Array) {
    this.publicKey = publicKey;
  }

  /**
   * Returns the raw bytes of the public key
   * @returns Uint8Array of the public key
   */
  asBytes(): Uint8Array {
    // Return a copy to prevent external modification
    return new Uint8Array(this.publicKey);
  }
}

/**
 * Represents a shared secret derived from a Diffie-Hellman key exchange
 */
export class SessionSharedSecret {
  private readonly sharedSecret: Uint8Array;

  constructor(sharedSecret: Uint8Array) {
    this.sharedSecret = sharedSecret;
  }

  /**
   * Returns the raw bytes of the shared secret
   * @returns Uint8Array of the shared secret
   */
  asBytes(): Uint8Array {
    // Return a copy to prevent external modification
    return new Uint8Array(this.sharedSecret);
  }
}
