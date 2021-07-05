import { PolicyMessageKit } from '../crypto/kits';
import { SigningPower } from '../crypto/powers';
import { UmbralPublicKey } from '../types';
import { encryptAndSign } from '../crypto/api';

export class Enrico {
  public readonly policyEncryptingKey: UmbralPublicKey;
  private readonly signingPower: SigningPower;

  constructor(
    policyEncryptingKey: UmbralPublicKey,
    enricoVerifyingKey?: UmbralPublicKey
  ) {
    this.policyEncryptingKey = policyEncryptingKey;
    if (enricoVerifyingKey) {
      this.signingPower = SigningPower.fromPublicKey(enricoVerifyingKey);
    } else {
      this.signingPower = SigningPower.fromRandom();
    }
  }

  public get verifyingKey(): UmbralPublicKey {
    return this.signingPower.publicKey;
  }

  public encrypt(plaintext: Buffer): PolicyMessageKit {
    return encryptAndSign(
      this.policyEncryptingKey,
      plaintext,
      this.signingPower.signer,
      this.signingPower.publicKey
    );
  }
}
