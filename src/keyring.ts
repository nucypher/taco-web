import {
  generateKFrags,
  MessageKit,
  PublicKey,
  SecretKey,
  SecretKeyFactory,
  Signer,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';

import { PolicyMessageKit } from './kits/message';
import { toBytes } from './utils';

export class Keyring {
  constructor(public readonly secretKey: SecretKey) {}

  public static random(): Keyring {
    return new Keyring(SecretKey.random());
  }

  public get signer(): Signer {
    return new Signer(this.secretKey);
  }

  public get publicKey(): PublicKey {
    return this.secretKey.publicKey();
  }

  public generateKFrags(
    receivingKey: PublicKey,
    signer: Signer,
    label: string,
    threshold: number,
    shares: number
  ): {
    readonly delegatingKey: PublicKey;
    readonly verifiedKFrags: readonly VerifiedKeyFrag[];
  } {
    const delegatingSecretKey = this.getSecretKeyFromLabel(label);
    const delegatingKey = delegatingSecretKey.publicKey();
    const verifiedKFrags: readonly VerifiedKeyFrag[] = generateKFrags(
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
      this.secretKey.toBEBytes()
    ).makeKey(toBytes(label));
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
