import {
  Capsule,
  CapsuleWithFrags,
  encrypt,
  PublicKey,
  Signature,
  Signer,
} from 'umbral-pre';

import {
  CAPSULE_LENGTH,
  PUBLIC_KEY_LENGTH,
  SIGNATURE_HEADER_HEX,
  SIGNATURE_LENGTH,
} from '../crypto/constants';
import {
  bytesEqual,
  decodeVariableLengthMessage,
  encodeVariableLengthMessage,
  fromHexString,
  split,
} from '../utils';

import { RetrievalKit, RetrievalResult } from './retrieval';

export class MessageKit {
  private static NO_BYTES = new Uint8Array([0]);
  private static HAS_BYTES = new Uint8Array([1]);

  constructor(
    public readonly capsule: Capsule,
    public readonly ciphertext: Uint8Array,
    public readonly senderVerifyingKey?: PublicKey,
    public readonly signature?: Signature
  ) {}

  public static author(
    recipientKey: PublicKey,
    plaintext: Uint8Array,
    signer: Signer
  ): MessageKit {
    const signature = signer.sign(plaintext);
    const payload = new Uint8Array([
      ...fromHexString(SIGNATURE_HEADER_HEX.SIGNATURE_TO_FOLLOW),
      ...signature.toBytes(),
      ...plaintext,
    ]);
    const { ciphertext, capsule } = encrypt(recipientKey, payload);
    return new MessageKit(
      capsule,
      ciphertext,
      signer.verifyingKey(),
      signature
    );
  }

  public static fromBytes(bytes: Uint8Array): MessageKit {
    const [capsule, remainder1] = split(bytes, CAPSULE_LENGTH);
    const [signature, remainder2] = this.parseSignature(remainder1);
    const [key, remainder3] = this.parseKey(remainder2);
    const [ciphertext, _] = decodeVariableLengthMessage(remainder3);
    return new MessageKit(
      Capsule.fromBytes(capsule),
      ciphertext,
      key ? PublicKey.fromBytes(key) : undefined,
      signature ? Signature.fromBytes(signature) : undefined
    );
  }

  private static parseSignature(
    bytes: Uint8Array
  ): [Uint8Array | undefined, Uint8Array] {
    return this.parseBytes(bytes, SIGNATURE_LENGTH);
  }

  private static parseKey(
    bytes: Uint8Array
  ): [Uint8Array | undefined, Uint8Array] {
    return this.parseBytes(bytes, PUBLIC_KEY_LENGTH);
  }

  private static parseBytes(
    bytes: Uint8Array,
    cutoff: number
  ): [Uint8Array | undefined, Uint8Array] {
    const [flag, remainder1] = split(bytes, 1);
    if (bytesEqual(flag, MessageKit.NO_BYTES)) {
      return [undefined, remainder1];
    } else if (bytesEqual(flag, MessageKit.HAS_BYTES)) {
      const [signature, newRemainder] = split(remainder1, cutoff);
      return [signature, newRemainder];
    } else {
      throw Error(`Incorrect format for bytes flag: ${flag}`);
    }
  }

  public toBytes(): Uint8Array {
    const signature = this.signature
      ? new Uint8Array([...MessageKit.HAS_BYTES, ...this.signature.toBytes()])
      : MessageKit.NO_BYTES;
    const senderVerifyingKey = this.senderVerifyingKey
      ? new Uint8Array([
          ...MessageKit.HAS_BYTES,
          ...this.senderVerifyingKey.toBytes(),
        ])
      : MessageKit.HAS_BYTES;
    return new Uint8Array([
      ...this.capsule.toBytes(),
      ...signature,
      ...senderVerifyingKey,
      ...encodeVariableLengthMessage(this.ciphertext),
    ]);
  }

  public asPolicyKit(
    policyEncryptingKey: PublicKey,
    threshold: number
  ): PolicyMessageKit {
    return PolicyMessageKit.fromMessageKit(
      this,
      policyEncryptingKey,
      threshold
    );
  }
}

export type ReencryptedMessageKit = Omit<MessageKit, 'capsule'> & {
  capsule: CapsuleWithFrags;
  delegatingKey: PublicKey;
};

export class PolicyMessageKit {
  constructor(
    public policyEncryptingKey: PublicKey,
    private threshold: number,
    private result: RetrievalResult,
    private messageKit: MessageKit
  ) {}

  public static fromMessageKit(
    messageKit: MessageKit,
    policyEncryptingKey: PublicKey,
    threshold: number
  ): PolicyMessageKit {
    return new PolicyMessageKit(
      policyEncryptingKey,
      threshold,
      RetrievalResult.empty(),
      messageKit
    );
  }

  public get senderVerifyingKey(): PublicKey | undefined {
    return this.messageKit.senderVerifyingKey;
  }

  public get capsule(): Capsule {
    return this.messageKit.capsule;
  }

  public get capsuleWithFrags(): CapsuleWithFrags {
    const capsule = this.messageKit.capsule;
    let capsuleWithFrags: CapsuleWithFrags;
    Object.values(this.result.cFrags).forEach((cFrag) => {
      capsuleWithFrags = capsuleWithFrags
        ? capsuleWithFrags.withCFrag(cFrag)
        : capsule.withCFrag(cFrag);
    });
    if (!capsuleWithFrags!) {
      throw 'Failed to attach any capsule fragments.';
    }
    return capsuleWithFrags!;
  }

  public get ciphertext(): Uint8Array {
    return this.messageKit.ciphertext;
  }

  public get signature(): Signature | undefined {
    return this.messageKit.signature;
  }

  public asRetrievalKit(): RetrievalKit {
    return new RetrievalKit(this.messageKit.capsule, this.result.addresses);
  }

  public isDecryptableByReceiver(): boolean {
    return (
      !!this.result.cFrags &&
      Object.keys(this.result.cFrags).length >= this.threshold
    );
  }

  public toBytes(): Uint8Array {
    return this.messageKit.toBytes();
  }

  public withResult(result: RetrievalResult): PolicyMessageKit {
    return new PolicyMessageKit(
      this.policyEncryptingKey,
      this.threshold,
      result,
      this.messageKit
    );
  }
}
