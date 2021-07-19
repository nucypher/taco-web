import { PublicKey } from 'umbral-pre';

import { PolicyMessageKit } from '../kits/message';
import { SigningPower } from '../crypto/powers';

export class Enrico {
  public readonly recipientEncryptingKey: PublicKey;
  private readonly signingPower: SigningPower;

  constructor(
    recipientEncryptingKey: PublicKey,
    enricoVerifyingKey?: PublicKey,
  ) {
    this.recipientEncryptingKey = recipientEncryptingKey;
    if (enricoVerifyingKey) {
      this.signingPower = SigningPower.fromPublicKey(enricoVerifyingKey);
    } else {
      this.signingPower = SigningPower.fromRandom();
    }
  }

  public get verifyingKey(): PublicKey {
    return this.signingPower.publicKey;
  }

  public encrypt(plaintext: Buffer): PolicyMessageKit {
    return encryptAndSign(
      this.recipientEncryptingKey,
      plaintext,
      this.signingPower.signer,
      this.signingPower.publicKey,
    );
  }
}
