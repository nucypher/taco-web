import { PolicyMessageKit } from '../crypto/kits';
import { SigningPower } from '../crypto/powers';
import { UmbralPublicKey } from '../types';
import { encryptAndSign } from '../crypto/api';

export class Enrico {
  private readonly policyEncryptingKey: UmbralPublicKey;
  private readonly signingPower: SigningPower;

  constructor(policyEncryptingKey: UmbralPublicKey) {
    this.policyEncryptingKey = policyEncryptingKey;
    this.signingPower = SigningPower.fromRandom();
  }

  public get verifyingKey(): UmbralPublicKey {
    return this.signingPower.publicKey;
  }

  public encrypt(plaintext: Buffer): PolicyMessageKit {
    const messageKit = encryptAndSign(
      this.policyEncryptingKey,
      plaintext,
      this.signingPower.signer
    );
    messageKit.policyPublicKey = this.policyEncryptingKey;
    return messageKit;
  }
}
