import * as umbral from 'umbral-pre';
import { Revocation, PreparedTreasureMap } from '../policies/collections';
import { ChecksumAddress, UmbralPublicKey, UmbralSigner } from '../types';

export class RevocationKit {
  private revocations: Record<ChecksumAddress, Revocation>;

  constructor(treasureMap: PreparedTreasureMap, signer: UmbralSigner) {
    this.revocations = {};
    Object.entries(treasureMap.nodes).forEach(([nodeId, arrangementId]) => {
      this.revocations[nodeId] = new Revocation(arrangementId, signer);
    });
  }
}

export class MessageKit {
  private capsule: umbral.Capsule;
  private ciphertext: Buffer;
  private signature: Buffer;
  private senderVerifyingKey: UmbralPublicKey;
  constructor(
    capsule: umbral.Capsule,
    ciphertext: Buffer,
    signature: Buffer,
    senderVerifyingKey: UmbralPublicKey
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

  public getVerifyingKey(): UmbralPublicKey {
    return this.senderVerifyingKey;
  }

  public getCapsule(): umbral.Capsule {
    return this.capsule;
  }

  public getCiphertext(): Buffer {
    return this.ciphertext;
  }
}

export class PolicyMessageKit extends MessageKit {
  public toBytes(): Buffer {
    return super.toBytes(true);
  }
}
