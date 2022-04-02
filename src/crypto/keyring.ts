import { SecretKey } from '@nucypher/nucypher-core';

import { DecryptingPower, DelegatingPower, SigningPower } from './powers';

export class NucypherKeyring {
  constructor(private readonly secretKey: SecretKey) {}

  public deriveDelegatingPower(): DelegatingPower {
    return new DelegatingPower(this.secretKey);
  }

  public deriveSigningPower(): SigningPower {
    return SigningPower.fromSecretKey(this.secretKey);
  }

  public deriveDecryptingPower(): DecryptingPower {
    return DecryptingPower.fromSecretKey(this.secretKey);
  }
}
