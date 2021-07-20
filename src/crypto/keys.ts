import { PublicKey, SecretKey } from 'umbral-pre';

import { keccakDigest } from './api';
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

  public async deriveSecretKeyFromLabel(label: string): Promise<SecretKey> {
    // TODO: Use HKDF that supports BLAKE2b(64) hash
    //       Warning: As of now, this hash is incompatible with `nucypher/nucypher` HKDF
    const keyBytes = keccakDigest(Buffer.from(label));
    return SecretKey.fromBytes(Buffer.from(keyBytes));
  }

  public deriveSecretKey(): SecretKey {
    return SecretKey.fromBytes(this.keyingMaterial);
  }

  public derivePublicKey(): PublicKey {
    return this.deriveSecretKey().publicKey();
  }
}
