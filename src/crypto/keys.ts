import * as umbral from 'umbral-pre';

import { UmbralPublicKey, UmbralSecretKey } from '../types';

export class UmbralKeyingMaterial {
  private keyingMaterial: Buffer;

  constructor(keyingMaterial: Buffer) {
    if (keyingMaterial.length !== 32) {
      throw Error(
        `UmbralKeyingMaterial must have size equal to 32 bytes, got ${keyingMaterial.length} instead.`
      );
    }
    this.keyingMaterial = keyingMaterial;
  }

  public deriveSecretKeyByLabel(label: string): UmbralSecretKey {
    // TODO: Implement HKDF
    // return umbral.SecretKey.from_bytes(Buffer.from(this.keyingMaterial));
    return umbral.SecretKey.random();
  }

  public deriveSecretKey(): UmbralSecretKey {
    return umbral.SecretKey.from_bytes(this.keyingMaterial);
  }

  public derivePublicKey(): UmbralPublicKey {
    const sk = this.deriveSecretKey();
    return umbral.PublicKey.from_secret_key(sk);
  }
}
