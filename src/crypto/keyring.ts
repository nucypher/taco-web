import { DelegatingPower, SigningPower } from './powers';

export class NucypherKeyring {
  private seed: Buffer;

  // TODO: Implement factory methods for different sources of entropy
  constructor(seed: Buffer) {
    this.seed = seed;
  }

  // TODO: Implement a strategy for deriving powers
  public deriveDelegatingPower(): DelegatingPower {
    return new DelegatingPower(this.seed);
  }

  public deriveSigningPower(): SigningPower {
    return new SigningPower(this.seed);
  }
}
