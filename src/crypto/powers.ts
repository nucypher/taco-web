import {
  KeyFrag,
  PublicKey,
  SecretKey,
  Signer,
  generateKFrags,
  decryptOriginal,
} from 'umbral-pre';
import secureRandom from 'secure-random';
import { UmbralKeyingMaterial } from './keys';
import { PolicyMessageKit, ReencryptedMessageKit } from './kits';
import { UMBRAL_KEYING_MATERIAL_BYTES_LENGTH } from './constants';

export class DelegatingPower {
  private umbralKeyingMaterial: UmbralKeyingMaterial;

  constructor(keyingMaterial: Buffer) {
    this.umbralKeyingMaterial = new UmbralKeyingMaterial(keyingMaterial);
  }

  public async generateKFrags(
    bobEncryptingKey: PublicKey,
    signer: Signer,
    label: string,
    m: number,
    n: number
  ): Promise<{
    delegatingPublicKey: PublicKey;
    kFrags: KeyFrag[];
  }> {
    const delegatingSecretKey = await this.getSecretKeyFromLabel(label);
    const delegatingPublicKey = await this.getPublicKeyFromLabel(label);
    const kFrags: KeyFrag[] = generateKFrags(
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

  private async getSecretKeyFromLabel(label: string): Promise<SecretKey> {
    return this.umbralKeyingMaterial.deriveSecretKeyFromLabel(label);
  }

  public async getPublicKeyFromLabel(label: string): Promise<PublicKey> {
    const sk = await this.getSecretKeyFromLabel(label);
    return sk.publicKey();
  }
}

abstract class CryptoPower {
  private readonly umbralKeyingMaterial?: UmbralKeyingMaterial;
  private readonly _publicKey?: PublicKey;

  protected constructor(keyingMaterial?: Buffer, publicKey?: PublicKey) {
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

  public get publicKey(): PublicKey {
    if (this.umbralKeyingMaterial) {
      return this.umbralKeyingMaterial.derivePublicKey();
    } else {
      return this._publicKey!;
    }
  }

  protected get secretKey(): SecretKey {
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
  public static fromPublicKey(publicKey: PublicKey): SigningPower {
    return new SigningPower(undefined, publicKey);
  }

  public static fromKeyingMaterial(keyingMaterial: Buffer): SigningPower {
    return new SigningPower(keyingMaterial, undefined);
  }

  public static fromRandom(): SigningPower {
    const keyingMaterial = secureRandom(UMBRAL_KEYING_MATERIAL_BYTES_LENGTH);
    return SigningPower.fromKeyingMaterial(keyingMaterial);
  }

  public get signer(): Signer {
    return new Signer(this.secretKey);
  }
}

export class DecryptingPower extends CryptoPower {
  public static fromPublicKey(publicKey: PublicKey): DecryptingPower {
    return new DecryptingPower(undefined, publicKey);
  }

  public static fromKeyingMaterial(keyingMaterial: Buffer): DecryptingPower {
    return new DecryptingPower(keyingMaterial, undefined);
  }

  public decrypt(messageKit: PolicyMessageKit | ReencryptedMessageKit): Buffer {
    if (messageKit instanceof PolicyMessageKit) {
      return Buffer.from(
        decryptOriginal(
          this.secretKey,
          messageKit.capsule,
          messageKit.ciphertext
        )
      );
    } else {
      return Buffer.from(
        messageKit.capsule.decryptReencrypted(
          this.secretKey,
          messageKit.recipientEncryptingKey,
          messageKit.ciphertext
        )
      );
    }
  }
}
