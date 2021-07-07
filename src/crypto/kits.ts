import { Capsule, CapsuleWithFrags, PublicKey, Signer } from 'umbral-pre';

import { PrePublishedTreasureMap, Revocation } from '../policies/collections';
import { ChecksumAddress } from '../types';
import { Enrico } from '../characters/enrico';

export class RevocationKit {
  public revocations: Record<ChecksumAddress, Revocation>;

  constructor(treasureMap: PrePublishedTreasureMap, signer: Signer) {
    this.revocations = {};
    Object.entries(treasureMap.destinations).forEach(
      ([nodeId, arrangementId]) => {
        this.revocations[nodeId] = new Revocation(arrangementId, signer);
      }
    );
  }
}

export class PolicyMessageKit {
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
    recipientEncryptingKey: PublicKey
  ) {
    this.capsule = capsule;
    this.ciphertext = ciphertext;
    this.signature = signature;
    this.senderVerifyingKey = senderVerifyingKey;
    this.recipientEncryptingKey = recipientEncryptingKey;
  }

  public toBytes(includeAlicePublicKey: boolean = true): Buffer {
    const asBytes = [this.capsule.toBytes()];
    if (includeAlicePublicKey && !!this.senderVerifyingKey) {
      asBytes.push(this.senderVerifyingKey.toBytes());
    }
    asBytes.push(this.ciphertext);
    return Buffer.concat(asBytes);
  }

  public ensureCorrectSender(
    enrico: Enrico,
    recipientEncryptingKey: PublicKey
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

// Just like a PolicyMessageKit, but with a different `capsule` type
// TODO: Cant use re-use existing type because of missing `toBytes` implementation
// export type ReencryptedMessageKit = Omit<PolicyMessageKit, 'capsule'> & {
//   capsule: CapsuleWithFrags;
// };
export interface ReencryptedMessageKit {
  capsule: CapsuleWithFrags;
  ciphertext: Buffer;
  signature: Buffer;
  senderVerifyingKey: PublicKey;
  recipientEncryptingKey: PublicKey;
}
