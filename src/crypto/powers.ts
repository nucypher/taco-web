import * as umbral from 'umbral-pre';
import {
  UmbralKFrag,
  UmbralPublicKey,
  UmbralSecretKey,
  UmbralSigner,
} from '../types';
import { UmbralKeyingMaterial } from './keys';
import { PolicyMessageKit } from './kits';

export class DelegatingPower {
  public async generateKFrags(
    bobEncryptingKey: UmbralPublicKey,
    signer: UmbralSigner,
    label: string,
    m: number,
    n: number
  ): Promise<{
    delegatingPublicKey: UmbralPublicKey;
    kFrags: UmbralKFrag[];
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

  public static fromPublicKey(pk: UmbralPublicKey): DelegatingPower {
    return new DelegatingPower(Buffer.from(pk.toBytes()));
  }
}

export class SigningPower {
  private umbralKeyingMetrial: UmbralKeyingMaterial;

  constructor(keyingMaterial: Buffer) {
    this.umbralKeyingMetrial = new UmbralKeyingMaterial(keyingMaterial);
  }

  public toUmbralSigner(): UmbralSigner {
    const sk = this.umbralKeyingMetrial.deriveSecretKey();
    return new umbral.Signer(sk);
  }

  public getPublicKey(): UmbralPublicKey {
    return this.umbralKeyingMetrial.derivePublicKey();
  }

  public static fromPublicKey(pk: UmbralPublicKey): SigningPower {
    return new SigningPower(Buffer.from(pk.toBytes()));
  }
}

export class DecryptingPower {
  private umbralKeyingMetrial: UmbralKeyingMaterial;

  constructor(keyingMaterial: Buffer) {
    this.umbralKeyingMetrial = new UmbralKeyingMaterial(keyingMaterial);
  }

  public decrypt(messageKit: PolicyMessageKit): Buffer {
    return Buffer.from(
      umbral.decryptOriginal(
        this.getSecretKey(),
        messageKit.getCapsule(),
        messageKit.getCiphertext()
      )
    );
  }

  private getSecretKey(): UmbralSecretKey {
    return this.umbralKeyingMetrial.deriveSecretKey();
  }

  public getPublicKey(): UmbralPublicKey {
    return this.umbralKeyingMetrial.derivePublicKey();
  }
}
