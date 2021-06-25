import { DecryptingPower, DelegatingPower, SigningPower } from './powers';

export class NucypherKeyring {
  private readonly seed: Buffer;

  constructor(seed: Buffer) {
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
}
