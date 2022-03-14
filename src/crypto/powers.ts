import {
  generateKFrags,
  MessageKit,
  PublicKey,
  SecretKey,
  SecretKeyFactory,
  Signer,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { PolicyMessageKit } from '../kits/message';
import { ChecksumAddress } from '../types';
import { toBytes } from '../utils';

export class TransactingPower {
  private constructor(private web3Provider: ethers.providers.Web3Provider) {}

  public static fromWeb3Provider(web3Provider: ethers.providers.Web3Provider) {
    return new TransactingPower(web3Provider);
  }

  public getAddress(): Promise<ChecksumAddress> {
    return this.web3Provider.getSigner().getAddress();
  }

  public get provider(): ethers.providers.Web3Provider {
    return this.web3Provider;
  }

  public get signer(): ethers.providers.JsonRpcSigner {
    return this.web3Provider.getSigner();
  }
}

export class DelegatingPower {
  private secretKeyBytes: Uint8Array;

  private constructor(secretKeyBytes: Uint8Array) {
    this.secretKeyBytes = secretKeyBytes;
  }

  public static fromSecretKeyBytes(secretKeyBytes: Uint8Array) {
    return new DelegatingPower(secretKeyBytes);
  }

  public generateKFrags(
    receivingKey: PublicKey,
    signer: Signer,
    label: string,
    threshold: number,
    shares: number
  ): {
    delegatingKey: PublicKey;
    verifiedKFrags: VerifiedKeyFrag[];
  } {
    const delegatingSecretKey = this.getSecretKeyFromLabel(label);
    const delegatingKey = delegatingSecretKey.publicKey();
    const verifiedKFrags: VerifiedKeyFrag[] = generateKFrags(
      delegatingSecretKey,
      receivingKey,
      signer,
      threshold,
      shares,
      false,
      false
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
    return SecretKeyFactory.fromSecureRandomness(this.secretKeyBytes).makeKey(
      toBytes(label)
    );
  }
}

abstract class CryptoPower {
  private readonly _secretKey?: SecretKey;
  private readonly _publicKey?: PublicKey;

  protected constructor(secretKeyBytes?: Uint8Array, publicKey?: PublicKey) {
    if (secretKeyBytes && publicKey) {
      throw new Error('Pass either secretKeyBytes or publicKey - not both.');
    }
    if (secretKeyBytes) {
      this._secretKey = SecretKey.fromBytes(secretKeyBytes);
      this._publicKey = this.secretKey.publicKey();
    }
    if (publicKey) {
      this._publicKey = publicKey;
    }
  }

  public get publicKey(): PublicKey {
    return this._publicKey!;
  }

  public get secretKey(): SecretKey {
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

  public static fromSecretKeyBytes(secretKeyBytes: Uint8Array): SigningPower {
    return new SigningPower(secretKeyBytes, undefined);
  }

  public static fromRandom(): SigningPower {
    return SigningPower.fromSecretKeyBytes(SecretKey.random().toSecretBytes());
  }
}

export class DecryptingPower extends CryptoPower {
  public static fromPublicKey(publicKey: PublicKey): DecryptingPower {
    return new DecryptingPower(undefined, publicKey);
  }

  public static fromSecretKeyBytes(
    secretKeyBytes: Uint8Array
  ): DecryptingPower {
    return new DecryptingPower(secretKeyBytes, undefined);
  }

  public decrypt(messageKit: PolicyMessageKit | MessageKit): Uint8Array {
    if (messageKit instanceof PolicyMessageKit) {
      if (!messageKit.isDecryptableByReceiver()) {
        throw Error('Unable to decrypt');
      }
      return messageKit.decryptReencrypted(
        this.secretKey,
        messageKit.policyEncryptingKey
      );
    } else {
      return messageKit.decrypt(this.secretKey);
    }
  }
}
