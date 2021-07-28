import { PublicKey, SecretKey } from 'umbral-pre';

import { toBytes } from '../utils';

import { keccakDigest } from './api';
import { UMBRAL_KEYING_MATERIAL_BYTES_LENGTH } from './constants';

export class UmbralKeyingMaterial {
  private readonly keyingMaterial: Uint8Array;

  constructor(keyingMaterial: Uint8Array) {
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
    const keyBytes = keccakDigest(toBytes(label));
    return SecretKey.fromBytes(keyBytes);
  }

  public deriveSecretKey(): SecretKey {
    return SecretKey.fromBytes(this.keyingMaterial);
  }

  public derivePublicKey(): PublicKey {
    return this.deriveSecretKey().publicKey();
  }
}
