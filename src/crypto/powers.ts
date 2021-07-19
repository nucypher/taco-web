import secureRandom from 'secure-random';
import {
  decryptOriginal,
  generateKFrags,
  KeyFrag,
  PublicKey,
  SecretKey,
  Signer,
} from 'umbral-pre';

import { UMBRAL_KEYING_MATERIAL_BYTES_LENGTH } from './constants';
import { Wallet } from 'ethers';
import { UmbralKeyingMaterial } from './keys';
import { PolicyMessageKit, ReencryptedMessageKit } from '../kits/message';
import { UMBRAL_KEYING_MATERIAL_BYTES_LENGTH } from './constants';
import { ChecksumAddress } from '../types';
import { Provider } from '@ethersproject/providers';

export abstract class TransactingPower {
  public abstract get account(): ChecksumAddress;

  public abstract get wallet(): Wallet;
  public abstract connect(provider: Provider): void;
}

export class DerivedTransactionPower extends TransactingPower {
  public wallet: Wallet;

  constructor(keyingMaterial: Buffer, provider?: Provider) {
    super();
    const secretKey = new UmbralKeyingMaterial(
      keyingMaterial,
    ).deriveSecretKey();
    this.wallet = new Wallet(secretKey.toSecretBytes());
    if (provider) {
      this.wallet.connect(provider);
    }
  }

  public get account(): ChecksumAddress {
    return this.wallet.address;
  }

  connect(provider: Provider): void {
    this.wallet = this.wallet.connect(provider);
  }
}

export class DelegatingPower {
  private keyingMaterial: UmbralKeyingMaterial;

  constructor(keyingMaterial: Buffer) {
    this.keyingMaterial = new UmbralKeyingMaterial(keyingMaterial);
  }

  public async generateKFrags(
    bobEncryptingKey: PublicKey,
    signer: Signer,
    label: string,
    m: number,
    n: number,
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
      false,
    );
    return {
      delegatingPublicKey,
      kFrags,
    };
  }

  private async getSecretKeyFromLabel(label: string): Promise<SecretKey> {
    return this.keyingMaterial.deriveSecretKeyFromLabel(label);
  }

  public async getPublicKeyFromLabel(label: string): Promise<PublicKey> {
    const sk = await this.getSecretKeyFromLabel(label);
    return sk.publicKey();
  }
}

abstract class CryptoPower {
  private readonly _secretKey?: SecretKey;
  private readonly _publicKey?: PublicKey;

  protected constructor(keyingMaterial?: Buffer, publicKey?: PublicKey) {
    if (keyingMaterial && publicKey) {
      throw new Error('Pass either keyMaterial or publicKey - not both.');
    }
    if (keyingMaterial) {
      this._secretKey = new UmbralKeyingMaterial(
        keyingMaterial,
      ).deriveSecretKey();
      this._publicKey = this.secretKey.publicKey();
    }
    if (publicKey) {
      this._publicKey = publicKey;
    }
  }

  public get publicKey(): PublicKey {
    return this._publicKey!;
  }

  protected get secretKey(): SecretKey {
    if (this._secretKey) {
      return this._secretKey;
    } else {
      throw new Error(
        'Power initialized with public key, secret key not present.',
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
          messageKit.ciphertext,
        ),
      );
    } else {
      return Buffer.from(
        messageKit.capsule.decryptReencrypted(
          this.secretKey,
          messageKit.recipientEncryptingKey,
          messageKit.ciphertext,
        ),
      );
    }
  }
}
