import { PrePublishedTreasureMap, Revocation } from '../policies/collections';
import {
  ChecksumAddress,
  UmbralCapsule,
  UmbralCapsuleWithFrags,
  UmbralPublicKey,
  UmbralSigner,
} from '../types';

export class RevocationKit {
  public revocations: Record<ChecksumAddress, Revocation>;

  constructor(treasureMap: PrePublishedTreasureMap, signer: UmbralSigner) {
    this.revocations = {};
    Object.entries(treasureMap.destinations).forEach(
      ([nodeId, arrangementId]) => {
        this.revocations[nodeId] = new Revocation(arrangementId, signer);
      }
    );
  }
}

export class PolicyMessageKit {
  public readonly capsule: UmbralCapsule;
  public readonly ciphertext: Buffer;
  public readonly signature: Buffer;
  public readonly senderVerifyingKey: UmbralPublicKey;
  public readonly recipientPublicKey: UmbralPublicKey;

  constructor(
    capsule: UmbralCapsule,
    ciphertext: Buffer,
    signature: Buffer,
    senderVerifyingKey: UmbralPublicKey,
    recipientPublicKey: UmbralPublicKey
  ) {
    this.capsule = capsule;
    this.ciphertext = ciphertext;
    this.signature = signature;
    this.senderVerifyingKey = senderVerifyingKey;
    this.recipientPublicKey = recipientPublicKey;
  }

  public toBytes(includeAlicePublicKey: boolean = true): Buffer {
    const asBytes = [this.capsule.toBytes()];
    if (includeAlicePublicKey && !!this.senderVerifyingKey) {
      asBytes.push(this.senderVerifyingKey.toBytes());
    }
    asBytes.push(this.ciphertext);
    return Buffer.concat(asBytes);
  }
}

// Just like a PolicyMessageKit, but with a different `capsule` type
// TODO: Cant use re-use existing type because of missing `toBytes` implementation
// export type ReencryptedMessageKit = Omit<PolicyMessageKit, 'capsule'> & {
//   capsule: UmbralCapsuleWithFrags;
// };
export interface ReencryptedMessageKit {
  capsule: UmbralCapsuleWithFrags;
  ciphertext: Buffer;
  signature: Buffer;
  senderVerifyingKey: UmbralPublicKey;
  recipientPublicKey: UmbralPublicKey;
}
