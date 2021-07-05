import * as umbral from 'umbral-pre';
import hkdf from '@ctrlpanel/hkdf';

import { UmbralPublicKey, UmbralSecretKey } from '../types';
import { UMBRAL_KEYING_MATERIAL_BYTES_LENGTH } from './constants';

export class UmbralKeyingMaterial {
  private readonly keyingMaterial: Buffer;

  constructor(keyingMaterial: Buffer) {
    if (keyingMaterial.length !== UMBRAL_KEYING_MATERIAL_BYTES_LENGTH) {
      throw Error(
        `Expected keyingMaterial to be ${UMBRAL_KEYING_MATERIAL_BYTES_LENGTH} bytes long, received ${keyingMaterial.length} bytes instead`
      );
    }
    this.keyingMaterial = keyingMaterial;
  }

  public async deriveSecretKeyFromLabel(
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
    // return umbral.SecretKey.fromBytes(keccakDigest(Buffer.from(label)));
  }

  public deriveSecretKey(): UmbralSecretKey {
    return umbral.SecretKey.fromBytes(this.keyingMaterial);
  }

  public derivePublicKey(): UmbralPublicKey {
    return this.deriveSecretKey().publicKey();
  }
}
