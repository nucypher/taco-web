import {
  Capsule,
  CapsuleWithFrags,
  encrypt,
  PublicKey,
  Signer,
} from 'umbral-pre';

import { Enrico } from '../characters/enrico';
import { Revocation } from '../policies/collections';
import { ChecksumAddress } from '../types';

export interface MessageKit {
  capsule: Capsule;
  ciphertext: Buffer;
  signature: Buffer;
  senderVerifyingKey: PublicKey;
  recipientEncryptingKey: PublicKey;
}

export type ReencryptedMessageKit = Omit<MessageKit, 'capsule'> & {
  capsule: CapsuleWithFrags;
};

export class PolicyMessageKit implements MessageKit {
  public readonly capsule: Capsule;
  public readonly ciphertext: Buffer;
  public readonly signature: Buffer;
  public readonly senderVerifyingKey: PublicKey;
  public readonly recipientEncryptingKey: PublicKey;

  constructor(
    capsule: Capsule,
    ciphertext: Buffer,
    signature: Buffer,
    senderVerifyingKey: PublicKey,
    recipientEncryptingKey: PublicKey,
  ) {
    this.capsule = capsule;
    this.ciphertext = ciphertext;
    this.signature = signature;
    this.senderVerifyingKey = senderVerifyingKey;
    this.recipientEncryptingKey = recipientEncryptingKey;
  }

  public toBytes(includeAlicePublicKey = true): Buffer {
    const asBytes = [ this.capsule.toBytes() ];
    if (includeAlicePublicKey && !!this.senderVerifyingKey) {
      asBytes.push(this.senderVerifyingKey.toBytes());
    }
    asBytes.push(this.ciphertext);
    return Buffer.concat(asBytes);
  }

  public ensureCorrectSender(
    enrico: Enrico,
    recipientEncryptingKey: PublicKey,
  ): void {
    if (
      enrico.recipientEncryptingKey !== this.recipientEncryptingKey &&
      recipientEncryptingKey !== this.recipientEncryptingKey
    ) {
      throw new Error('Recipient encrypting key does not match');
    }
    // TODO: What checks should we perform here?
    // if (enrico.verifyingKey !== this.senderVerifyingKey) {
    //   throw new Error('Sender verifying key does not match');
    // }
  }
}
