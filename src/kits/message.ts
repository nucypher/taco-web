import { Capsule, CapsuleWithFrags, PublicKey } from 'umbral-pre';

import { Enrico } from '../characters/enrico';
import { encodeVariableLengthMessage } from '../utils';

export class MessageKit {
  constructor(
    public readonly capsule: Capsule,
    public readonly ciphertext: Uint8Array,
    public readonly signature: Uint8Array,
    public readonly recipientPublicKey: PublicKey
  ) {}
}

export type ReencryptedMessageKit = Omit<MessageKit, 'capsule'> & {
  capsule: CapsuleWithFrags;
  senderVerifyingKey: PublicKey;
};

export class PolicyMessageKit extends MessageKit {
  constructor(
    public readonly capsule: Capsule,
    public readonly ciphertext: Uint8Array,
    public readonly signature: Uint8Array,
    public readonly recipientPublicKey: PublicKey,
    public readonly senderVerifyingKey: PublicKey
  ) {
    super(capsule, ciphertext, signature, recipientPublicKey);
  }

  public static fromMessageKit(
    messageKit: MessageKit,
    senderVerifyingKey: PublicKey
  ): PolicyMessageKit {
    const { capsule, ciphertext, signature, recipientPublicKey } = messageKit;
    return new PolicyMessageKit(
      capsule,
      ciphertext,
      signature,
      recipientPublicKey,
      senderVerifyingKey
    );
  }

  public toBytes(includeAlicePublicKey = true): Uint8Array {
    const asBytes = [this.capsule.toBytes()];
    if (includeAlicePublicKey && !!this.senderVerifyingKey) {
      asBytes.push(this.senderVerifyingKey.toBytes());
    }
    const encodedCiphertext = encodeVariableLengthMessage(this.ciphertext);
    asBytes.push(encodedCiphertext);
    // asBytes.forEach((a) => console.log(toHexString(a)));
    return asBytes.reduce((prev, next) => new Uint8Array([...prev, ...next]));
  }

  public ensureCorrectSender(enrico: Enrico, recipientEncryptingKey: PublicKey): void {
    if (
      enrico.recipientEncryptingKey !== this.recipientPublicKey &&
      recipientEncryptingKey !== this.recipientPublicKey
    ) {
      throw new Error('Recipient encrypting key does not match');
    }
    // TODO: What checks should we perform here?
    // if (enrico.verifyingKey !== this.senderVerifyingKey) {
    //   throw new Error('Sender verifying key does not match');
    // }
  }
}
