import { encrypt } from 'umbral-pre';
import { UmbralPublicKey } from '../types';

export interface EncryptedMessage {
  capsule: Buffer;
  ciphertext: Buffer;
}

export class Enrico {
  private policyEncryptingKey: UmbralPublicKey;
  private veryfingKey?: UmbralPublicKey;

  constructor(
    policyEncryptingKey: UmbralPublicKey,
    veryfingKey?: UmbralPublicKey
  ) {
    this.policyEncryptingKey = policyEncryptingKey;
    this.veryfingKey = veryfingKey;
  }

  public encryptMessage(plaintext: Buffer): EncryptedMessage {
    const messageKit = encrypt(this.policyEncryptingKey, plaintext);
    return {
      capsule: Buffer.from(messageKit.capsule.toBytes()),
      ciphertext: Buffer.from(messageKit.ciphertext),
    };
  }
}
