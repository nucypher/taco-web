import * as umbral from 'umbral-pre';
import { UmbralPublicKey } from '../types';

export class MessageKit {
  private capsule: umbral.Capsule;
  private ciphertext: Buffer;
  private signature: Buffer;
  private senderVerifyingKey: UmbralPublicKey | undefined;
  constructor(
    capsule: umbral.Capsule,
    ciphertext: Buffer,
    signature: Buffer,
    senderVerifyingKey?: UmbralPublicKey
  ) {
    this.capsule = capsule;
    this.ciphertext = ciphertext;
    this.signature = signature;
    this.senderVerifyingKey = senderVerifyingKey;
  }

  public toBytes(includeAlicePublicKey = true): Buffer {
    const asBytes = [this.capsule.toBytes()];
    if (includeAlicePublicKey && !!this.senderVerifyingKey) {
      asBytes.push(this.senderVerifyingKey.toBytes());
    }
    asBytes.push(this.ciphertext);
    return Buffer.concat(asBytes);
  }
}

export class PolicyMessageKit extends MessageKit {
  public toBytes(): Buffer {
    return super.toBytes(true);
  }
}
