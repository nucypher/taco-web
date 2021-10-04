import { UMBRAL_KEYING_MATERIAL_BYTES_LENGTH } from './constants';
import {
  DecryptingPower,
  DelegatingPower,
  DerivedTransactionPower,
  SigningPower,
} from './powers';

export class NucypherKeyring {
  private readonly secretKeyBytes: Uint8Array;

  constructor(secretKeyBytes: Uint8Array) {
    if (secretKeyBytes.length !== UMBRAL_KEYING_MATERIAL_BYTES_LENGTH) {
      throw Error(
        `Expected secretKeyBytes to be ${UMBRAL_KEYING_MATERIAL_BYTES_LENGTH} bytes long, received ${secretKeyBytes.length} bytes instead`
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

  public deriveTransactingPower(): DerivedTransactionPower {
    return DerivedTransactionPower.fromSecretKeyBytes(this.secretKeyBytes);
  }
}
