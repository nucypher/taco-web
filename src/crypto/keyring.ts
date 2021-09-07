import {
  DecryptingPower,
  DelegatingPower,
  DerivedTransactionPower,
  SigningPower,
} from './powers';

export class NucypherKeyring {
  private readonly keyingMaterial: Uint8Array;

  constructor(keyingMaterial: Uint8Array) {
    this.keyingMaterial = keyingMaterial;
  }

  public deriveDelegatingPower(): DelegatingPower {
    return DelegatingPower.fromKeyingMaterial(this.keyingMaterial);
  }

  public deriveSigningPower(): SigningPower {
    return SigningPower.fromKeyingMaterial(this.keyingMaterial);
  }

  public deriveDecryptingPower(): DecryptingPower {
    return DecryptingPower.fromKeyingMaterial(this.keyingMaterial);
  }

  public deriveTransactingPower(): DerivedTransactionPower {
    return DerivedTransactionPower.fromKeyingMaterial(this.keyingMaterial);
  }
}
