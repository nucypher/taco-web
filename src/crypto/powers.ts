import * as umbral from 'umbral-pre';
import {
  UmbralKFrags,
  UmbralPublicKey,
  UmbralSecretKey,
  UmbralSigner,
} from '../types';
import { UmbralKeyingMaterial } from './keys';

export class DelegatingPower {
  public async generateKFrags(
    bobEncryptingKey: UmbralPublicKey,
    signer: UmbralSigner,
    label: string,
    m: number,
    n: number
  ): Promise<{
    delegatingPublicKey: UmbralPublicKey;
    kFrags: UmbralKFrags[];
  }> {
    const delegatingSecretKey = await this.getSecretKeyFromLabel(label);
    const delegatingPublicKey = await this.getPublicKeyFromLabel(label);
    const kFrags = umbral.generateKFrags(
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

  public async getSecretKeyFromLabel(label: string): Promise<UmbralSecretKey> {
    return this.umbralKeyingMetrial.deriveSecretKeyByLabel(label);
  }

  public async getPublicKeyFromLabel(label: string): Promise<UmbralPublicKey> {
    const sk = await this.getSecretKeyFromLabel(label);
    return umbral.PublicKey.fromSecretKey(sk);
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

  public getPublicKey(): UmbralPublicKey {
    return this.umbralKeyingMetrial.derivePublicKey();
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
