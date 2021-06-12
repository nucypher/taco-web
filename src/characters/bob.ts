import { DecryptingPower, SigningPower } from '../crypto/powers';
import { HexEncodedBytes, UmbralPublicKey } from '../types';
import * as umbral from "umbral-pre";

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
    // TODO: Implement powers after enabling `to_bytes` method on `umbral.PublicKey` and `umbral.SecretKey`
    // const signingPower = new SigningPower(verifyingKey.to_bytes());
    // const decryptingPower = new DecryptingPower(encryptingKey.to_bytes());
    // return new Bob(signingPower, decryptingPowe)r;
    throw new Error('Method not implemented.');
  }

  public getEncryptingKey(): UmbralPublicKey {
    return this.decryptingPower.getPublicKey();
  }

  public retrieve(): void {}

  public joinPolicy(label: string, aliceSignerPublicKey: UmbralPublicKey) {
    throw new Error('Method not implemented.');
  }
}
