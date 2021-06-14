import * as umbral from 'umbral-pre';
import hkdf from '@ctrlpanel/hkdf';
import { UmbralPublicKey, UmbralSecretKey } from '../types';

export class UmbralKeyingMaterial {
  private keyingMaterial: Buffer;

  constructor(keyingMaterial: Buffer) {
    this.keyingMaterial = keyingMaterial;
  }

  public async deriveSecretKeyByLabel(
    label: string,
    salt?: Buffer
  ): Promise<UmbralSecretKey> {
    // TODO: Use HKDF that supports BLAKE2b(64) hash
    //       Warning: As of now, this hash is incompatible with `nucypher/nucypher` HKDF
    const keyBytes = await hkdf(
      salt ?? Buffer.from('bad-salt'),
      this.keyingMaterial,
      Buffer.from(`NuCypher/KeyDerivation/${label}`),
      32,
      'SHA-256'
    );
    return umbral.SecretKey.fromBytes(Buffer.from(keyBytes));
  }

  public deriveSecretKey(): UmbralSecretKey {
    return umbral.SecretKey.fromBytes(this.keyingMaterial);
  }

  public derivePublicKey(): UmbralPublicKey {
    const sk = this.deriveSecretKey();
    return umbral.PublicKey.fromSecretKey(sk);
  }
}
