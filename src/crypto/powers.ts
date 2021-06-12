import * as umbral from 'umbral-pre';

import {
  KeyFrags,
  UmbralPublicKey,
  UmbralSecretKey,
  UmbralSigner,
} from '../types';
import { UmbralKeyingMaterial } from './keys';

export class DelegatingPower {
  generateKFrags(
    bobEncryptingKey: UmbralPublicKey,
    signer: UmbralSigner,
    label: string,
    m: number,
    n: number
  ): KeyFrags {
    const delegatingSecretKey = this.getSecretKeyFromLabel(label);
    const delegatingPublicKey= this.getPublicKeyFromLabel(label);
    const kFrags = umbral.generate_kfrags(
      delegatingSecretKey,
      bobEncryptingKey,
      signer,
      m,
      n,
      false,
      false
    );
    return {
      delegatingPublicKey,
      kFrags,
    };
  }
  private umbralKeyingMetrial: UmbralKeyingMaterial;

  constructor(keyingMaterial: Buffer) {
    this.umbralKeyingMetrial = new UmbralKeyingMaterial(keyingMaterial);
  }

  public getSecretKeyFromLabel(label: string): UmbralSecretKey {
    return this.umbralKeyingMetrial.deriveSecretKeyByLabel(label);
  }

  public getPublicKeyFromLabel(label: string): UmbralPublicKey {
    const sk = this.getSecretKeyFromLabel(label);
    return umbral.PublicKey.from_secret_key(sk);
  }
}

export class SigningPower {
  private umbralKeyingMetrial: UmbralKeyingMaterial;

  constructor(keyingMaterial: Buffer) {
    this.umbralKeyingMetrial = new UmbralKeyingMaterial(keyingMaterial);
  }

  public sign(bytes: Buffer): Buffer {
    throw new Error('Method not implemented.');
  }

  public toUmbralSigner(): UmbralSigner {
    const sk = this.umbralKeyingMetrial.deriveSecretKey();
    return new umbral.Signer(sk);
  }
}

export class DecryptingPower {
  private umbralKeyingMetrial: UmbralKeyingMaterial;

  constructor(keyingMaterial: Buffer) {
    this.umbralKeyingMetrial = new UmbralKeyingMaterial(keyingMaterial);
  }

  public decrypt(bytes: Buffer): Buffer {
    throw new Error('Method not implemented.');
  }

  public getPublicKey(): UmbralPublicKey {
    return this.umbralKeyingMetrial.derivePublicKey();
  }
}
