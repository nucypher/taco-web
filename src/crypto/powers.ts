import * as umbral from 'umbral-pre';

import {
  UmbralKFrag,
  UmbralPublicKey,
  UmbralSecretKey,
  UmbralSigner,
} from '../types';
import { UmbralKeyingMaterial } from './keys';
import { PolicyMessageKit, ReencryptedMessageKit } from './kits';

export class DelegatingPower {
  private umbralKeyingMaterial: UmbralKeyingMaterial;

  constructor(keyingMaterial: Buffer) {
    this.umbralKeyingMaterial = new UmbralKeyingMaterial(keyingMaterial);
  }

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
    const kFrags: UmbralKFrag[] = umbral.generateKFrags(
      delegatingSecretKey,
      bobEncryptingKey,
      signer,
      m,
      n,
      true,
      true
    );
    return {
      delegatingPublicKey,
      kFrags,
    };
  }

  private async getSecretKeyFromLabel(label: string): Promise<UmbralSecretKey> {
    return this.umbralKeyingMaterial.deriveSecretKeyFromLabel(label);
  }

  public async getPublicKeyFromLabel(label: string): Promise<UmbralPublicKey> {
    const sk = await this.getSecretKeyFromLabel(label);
    return sk.publicKey();
  }
}

abstract class CryptoPower {
  private readonly umbralKeyingMaterial?: UmbralKeyingMaterial;
  private readonly _publicKey?: UmbralPublicKey;

  protected constructor(keyingMaterial?: Buffer, publicKey?: UmbralPublicKey) {
    if (keyingMaterial && publicKey) {
      throw new Error('Pass either keyMaterial or publicKey - not both.');
    }
    if (keyingMaterial) {
      this.umbralKeyingMaterial = new UmbralKeyingMaterial(keyingMaterial);
    }
    if (publicKey) {
      this._publicKey = publicKey;
    }
  }

  public get publicKey(): UmbralPublicKey {
    if (this.umbralKeyingMaterial) {
      return this.umbralKeyingMaterial.derivePublicKey();
    } else {
      return this._publicKey!;
    }
  }

  protected get secretKey(): UmbralSecretKey {
    if (this.umbralKeyingMaterial) {
      return this.umbralKeyingMaterial.deriveSecretKey();
    } else {
      throw new Error(
        'Power initialized with public key, secret key not present.'
      );
    }
  }
}

// TODO: Deduplicate `from*` methods into `CryptoPower`?

export class SigningPower extends CryptoPower {
  public static fromPublicKey(publicKey: UmbralPublicKey): SigningPower {
    return new SigningPower(undefined, publicKey);
  }

  public static fromKeyingMaterial(keyingMaterial: Buffer): SigningPower {
    return new SigningPower(keyingMaterial, undefined);
  }

  public static fromRandom(): SigningPower {
    const keyingMaterial = Buffer.from(umbral.SecretKey.random().toBytes());
    return SigningPower.fromKeyingMaterial(keyingMaterial);
  }

  public get signer(): UmbralSigner {
    return new umbral.Signer(this.secretKey);
  }
}

export class DecryptingPower extends CryptoPower {
  public static fromPublicKey(publicKey: UmbralPublicKey): DecryptingPower {
    return new DecryptingPower(undefined, publicKey);
  }

  public static fromKeyingMaterial(keyingMaterial: Buffer): DecryptingPower {
    return new DecryptingPower(keyingMaterial, undefined);
  }

  public decrypt(messageKit: PolicyMessageKit | ReencryptedMessageKit): Buffer {
    if (messageKit instanceof PolicyMessageKit) {
      // TODO: Does it ever run? What is the case where we decrypt the original capsule?
      return Buffer.from(
        umbral.decryptOriginal(
          this.secretKey,
          messageKit.capsule,
          messageKit.ciphertext
        )
      );
    } else {
      return Buffer.from(
        messageKit.capsule.decryptReencrypted(
          this.secretKey,
          messageKit.senderVerifyingKey!,
          messageKit.ciphertext
        )
      );
    }
  }
}
