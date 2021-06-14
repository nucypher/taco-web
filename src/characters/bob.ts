import { DecryptingPower, SigningPower } from '../crypto/powers';
import { UmbralPublicKey } from '../types';

export class Bob {
  private signingPower: SigningPower;
  private decryptingPower: DecryptingPower;

  constructor(signingPower: SigningPower, decryptingPower: DecryptingPower) {
    this.signingPower = signingPower;
    this.decryptingPower = decryptingPower;
  }

  static fromPublicKeys(
    verifyingKey: UmbralPublicKey,
    encryptingKey: UmbralPublicKey
  ): Bob {
    // Remove prefix for public keys
    const vkBytes = Buffer.from(verifyingKey.toBytes().slice(1));
    const ekBytes = Buffer.from(encryptingKey.toBytes().slice(1));
    const signingPower = new SigningPower(vkBytes);
    const decryptingPower = new DecryptingPower(ekBytes);
    return new Bob(signingPower, decryptingPower);
  }

  public getEncryptingKey(): UmbralPublicKey {
    // TODO: Is this correct key? Should we use decrypting power here?
    return this.decryptingPower.getPublicKey();
  }

  public getSignerPublicKey(): UmbralPublicKey {
    return this.signingPower.getPublicKey();
  }

  public retrieve(): void {}

  public joinPolicy(label: string, aliceSignerPublicKey: UmbralPublicKey) {
    throw new Error('Method not implemented.');
  }
}
