import { PublicKey } from 'umbral-pre';

import { encryptAndSign } from '../crypto/api';
import { SigningPower } from '../crypto/powers';
import { PolicyMessageKit } from '../kits/message';
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

  public encrypt(plaintext: Uint8Array | string): PolicyMessageKit {
    const plaintextBytes =
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext);
    const messageKit = encryptAndSign(
      this.policyEncryptingKey,
      plaintextBytes,
      this.signingPower.signer
    );
    return PolicyMessageKit.fromMessageKit(
      messageKit,
      this.signingPower.signer.verifyingKey()
    );
  }
}
