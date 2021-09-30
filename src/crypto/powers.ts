import { Provider } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import secureRandom from 'secure-random';
import {
  decryptOriginal,
  generateKFrags,
  KeyFrag,
  PublicKey,
  SecretKey,
  Signer,
  VerifiedKeyFrag,
} from 'umbral-pre';

import { MessageKit, PolicyMessageKit } from '../kits/message';
import { ChecksumAddress } from '../types';

import { UMBRAL_KEYING_MATERIAL_BYTES_LENGTH } from './constants';
import { UmbralKeyingMaterial } from './keys';

export abstract class TransactingPower {
  public abstract get account(): ChecksumAddress;

  public abstract get wallet(): Wallet;

  public abstract connect(provider: Provider): void;
}

export class DerivedTransactionPower extends TransactingPower {
  public wallet: Wallet;

  private constructor(keyingMaterial: Uint8Array, provider?: Provider) {
    super();
    this.wallet = new Wallet(keyingMaterial);
    if (provider) {
      this.connect(provider);
    }
  }

  public get account(): ChecksumAddress {
    return this.wallet.address;
  }

  public static fromKeyingMaterial(
    keyingMaterial: Uint8Array
  ): DerivedTransactionPower {
    return new DerivedTransactionPower(keyingMaterial);
  }

  public connect(provider: Provider): void {
    this.wallet = this.wallet.connect(provider);
  }
}

export class DelegatingPower {
  private keyingMaterial: UmbralKeyingMaterial;

  private constructor(keyingMaterial: Uint8Array) {
    this.keyingMaterial = new UmbralKeyingMaterial(keyingMaterial);
  }

  public static fromKeyingMaterial(keyingMaterial: Uint8Array) {
    return new DelegatingPower(keyingMaterial);
  }

  public async generateKFrags(
    receivingKey: PublicKey,
    signer: Signer,
    label: string,
    threshold: number,
    shares: number
  ): Promise<{
    delegatingKey: PublicKey;
    verifiedKFrags: VerifiedKeyFrag[];
  }> {
    const delegatingSecretKey = await this.getSecretKeyFromLabel(label);
    const delegatingKey = delegatingSecretKey.publicKey();
    const kFrags: KeyFrag[] = generateKFrags(
      delegatingSecretKey,
      receivingKey,
      signer,
      threshold,
      shares,
      false,
      false
    );
    // Turn KFrags into VerifiedKFrags - we know they're good
    const verifiedKFrags = kFrags.map((kFrag) =>
      VerifiedKeyFrag.fromVerifiedBytes(kFrag.toBytes())
    );
    return {
      delegatingKey,
      verifiedKFrags,
    };
  }

  public getPublicKeyFromLabel(label: string): PublicKey {
    return this.getSecretKeyFromLabel(label).publicKey();
  }

  private getSecretKeyFromLabel(label: string): SecretKey {
    return this.keyingMaterial.deriveSecretKeyFromLabel(label);
  }
}

abstract class CryptoPower {
  private readonly _secretKey?: SecretKey;
  private readonly _publicKey?: PublicKey;

  protected constructor(keyingMaterial?: Uint8Array, publicKey?: PublicKey) {
    if (keyingMaterial && publicKey) {
      throw new Error('Pass either keyingMaterial or publicKey - not both.');
    }
    if (keyingMaterial) {
      this._secretKey = new UmbralKeyingMaterial(
        keyingMaterial
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
        'Power initialized with public key, secret key not present.'
      );
    }
  }
}

// TODO: Deduplicate `from*` methods into `CryptoPower`?

export class SigningPower extends CryptoPower {
  public get signer(): Signer {
    return new Signer(this.secretKey);
  }

  public static fromPublicKey(publicKey: PublicKey): SigningPower {
    return new SigningPower(undefined, publicKey);
  }

  public static fromKeyingMaterial(keyingMaterial: Uint8Array): SigningPower {
    return new SigningPower(keyingMaterial, undefined);
  }

  public static fromRandom(): SigningPower {
    const keyingMaterial = secureRandom(UMBRAL_KEYING_MATERIAL_BYTES_LENGTH);
    return SigningPower.fromKeyingMaterial(keyingMaterial);
  }
}

export class DecryptingPower extends CryptoPower {
  public static fromPublicKey(publicKey: PublicKey): DecryptingPower {
    return new DecryptingPower(undefined, publicKey);
  }

  public static fromKeyingMaterial(
    keyingMaterial: Uint8Array
  ): DecryptingPower {
    return new DecryptingPower(keyingMaterial, undefined);
  }

  public decrypt(messageKit: PolicyMessageKit | MessageKit): Uint8Array {
    if (messageKit instanceof PolicyMessageKit) {
      if (!messageKit.isDecryptableByReceiver()) {
        throw Error('Unable to decrypt');
      }
      return messageKit.capsuleWithFrags.decryptReencrypted(
        this.secretKey,
        messageKit.policyEncryptingKey,
        messageKit.ciphertext
      );
    } else {
      return decryptOriginal(
        this.secretKey,
        messageKit.capsule,
        messageKit.ciphertext
      );
    }
  }
}
