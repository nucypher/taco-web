import { DecryptingPower, DelegatingPower, SigningPower } from './powers';

export class NucypherKeyring {
  private readonly KEYING_MATERIAL_BYTES_LENGTH = 32;
  private readonly secretKeyBytes: Uint8Array;

  constructor(secretKeyBytes: Uint8Array) {
    if (secretKeyBytes.length !== this.KEYING_MATERIAL_BYTES_LENGTH) {
      throw Error(
        `Expected secretKeyBytes to be ${this.KEYING_MATERIAL_BYTES_LENGTH} bytes long, received ${secretKeyBytes.length} bytes instead`
      );
    }
    this.secretKeyBytes = secretKeyBytes;
  }

  public deriveDelegatingPower(): DelegatingPower {
    return DelegatingPower.fromSecretKeyBytes(this.secretKeyBytes);
  }

  public deriveSigningPower(): SigningPower {
    return SigningPower.fromSecretKeyBytes(this.secretKeyBytes);
  }

  public deriveDecryptingPower(): DecryptingPower {
    return DecryptingPower.fromSecretKeyBytes(this.secretKeyBytes);
  }
}
