import { PublicKey } from 'umbral-pre';

import { encryptAndSign } from '../crypto/api';
import { SigningPower } from '../crypto/powers';
import { PolicyMessageKit } from '../kits/message';
import { toBytes } from '../utils';

export class Enrico {
  public readonly recipientEncryptingKey: PublicKey;
  private readonly signingPower: SigningPower;

  constructor(recipientEncryptingKey: PublicKey, enricoVerifyingKey?: PublicKey) {
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

  public encrypt(plaintext: Uint8Array | string): PolicyMessageKit {
    const plaintextBytes = plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext);
    const messageKit = encryptAndSign(
      this.recipientEncryptingKey,
      plaintextBytes,
      this.signingPower.signer
    );
    return PolicyMessageKit.fromMessageKit(messageKit, this.signingPower.signer.verifyingKey());
  }
}
