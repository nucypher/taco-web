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
  constructor(private readonly secretKey: SecretKey) {}

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
    return SecretKeyFactory.fromSecureRandomness(
      this.secretKey.toSecretBytes()
    ).makeKey(toBytes(label));
  }
}

abstract class CryptoPower {
  private readonly _secretKey?: SecretKey;
  private readonly _publicKey?: PublicKey;

  protected constructor(secretKey?: SecretKey, publicKey?: PublicKey) {
    if (SecretKey && publicKey) {
      throw new Error('Pass either a secret key or a public key - not both.');
    }
    if (secretKey) {
      this._secretKey = secretKey;
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

  public static fromSecretKey(secretKey: SecretKey): SigningPower {
    return new SigningPower(secretKey, undefined);
  }

  public static fromRandom(): SigningPower {
    return SigningPower.fromSecretKey(SecretKey.random());
  }
}

export class DecryptingPower extends CryptoPower {
  public static fromPublicKey(publicKey: PublicKey): DecryptingPower {
    return new DecryptingPower(undefined, publicKey);
  }

  public static fromSecretKey(secretKey: SecretKey): DecryptingPower {
    return new DecryptingPower(secretKey, undefined);
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
