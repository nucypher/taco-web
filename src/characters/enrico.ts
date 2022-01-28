import { MessageKit, PublicKey } from '@nucypher/nucypher-core';

import { SigningPower } from '../crypto/powers';
import { toBytes } from '../utils';

export class Enrico {
  public readonly policyEncryptingKey: PublicKey;
  private readonly signingPower: SigningPower;

  constructor(policyEncryptingKey: PublicKey, verifyingKey?: PublicKey) {
    this.policyEncryptingKey = policyEncryptingKey;
    if (verifyingKey) {
      this.signingPower = SigningPower.fromPublicKey(verifyingKey);
    } else {
      this.signingPower = SigningPower.fromRandom();
    }
  }

  public get verifyingKey(): PublicKey {
    return this.signingPower.publicKey;
  }

  public encryptMessage(plaintext: Uint8Array | string): MessageKit {
    return new MessageKit(
      this.policyEncryptingKey,
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext)
    );
  }
}
