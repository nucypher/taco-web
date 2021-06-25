import { Enrico } from '../';
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
  // TODO: What is the case when signature is undefined?
  public readonly signature?: Buffer;
  // TODO: Simplify to only use sender or senderVerifyingKey
  public readonly senderVerifyingKey?: UmbralPublicKey;
  public policyPublicKey?: UmbralPublicKey;
  public sender?: Enrico;

  constructor(
    capsule: UmbralCapsule,
    ciphertext: Buffer,
    signature?: Buffer,
    senderVerifyingKey?: UmbralPublicKey,
    sender?: Enrico
  ) {
    this.capsule = capsule;
    this.ciphertext = ciphertext;
    this.signature = signature;
    this.senderVerifyingKey = senderVerifyingKey;
    this.sender = sender;
  }

  public get verifyingKey(): UmbralPublicKey {
    if (!this.senderVerifyingKey && !this.sender?.verifyingKey) {
      throw Error('PolicyMessageKit has no sender verifying key.');
    }
    return this.senderVerifyingKey ?? this.senderVerifyingKey!;
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
    enrico?: Enrico,
    policyEncryptingKey?: UmbralPublicKey
  ): void {
    if (this.sender) {
      if (enrico && this.sender !== enrico) {
        throw new Error(`Mismatched sender`);
      }
    } else if (enrico) {
      this.sender = enrico;
    } else if (this.senderVerifyingKey && policyEncryptingKey) {
      this.sender = new Enrico(policyEncryptingKey);
    } else {
      throw new Error(
        'No information provided to set the message kit sender. Need eiter `enrico` or `policy_encrypting_key` to be given.'
      );
    }
  }
}

export interface ReencryptedMessageKit {
  capsule: UmbralCapsuleWithFrags;
  ciphertext: Buffer;
  signature?: Buffer;
  senderVerifyingKey?: UmbralPublicKey;
  sender?: Enrico;
}
