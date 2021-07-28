import {
  DecryptingPower,
  DelegatingPower,
  DerivedTransactionPower,
  SigningPower,
} from './powers';

export class NucypherKeyring {
  private readonly seed: Uint8Array;

  constructor(seed: Uint8Array) {
    this.seed = seed;
  }

  public deriveDelegatingPower(): DelegatingPower {
    return new DelegatingPower(this.seed);
  }

  public deriveSigningPower(): SigningPower {
    return SigningPower.fromKeyingMaterial(this.seed);
  }

  public deriveDecryptingPower(): DecryptingPower {
    return DecryptingPower.fromKeyingMaterial(this.seed);
  }

  public deriveTransactingPower(): DerivedTransactionPower {
    return new DerivedTransactionPower(this.seed);
  }
}
