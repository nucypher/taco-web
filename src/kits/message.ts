import { Capsule, CapsuleWithFrags, encrypt, PublicKey } from '@nucypher/umbral-pre';

import { CAPSULE_LENGTH } from '../crypto/constants';
import {
  decodeVariableLengthMessage,
  encodeVariableLengthMessage,
  split,
} from '../utils';
import {
  Deserializer,
  Versioned,
  VersionedDeserializers,
  VersionedParser,
  VersionHandler,
  VersionTuple,
} from '../versioning';

import { RetrievalKit, RetrievalResult } from './retrieval';

export class MessageKit implements Versioned {
  private static readonly BRAND = 'MKit';
  private static readonly VERSION: VersionTuple = [1, 0];

  constructor(
    public readonly capsule: Capsule,
    public readonly ciphertext: Uint8Array
  ) {}

  public static author(
    recipientKey: PublicKey,
    message: Uint8Array
  ): MessageKit {
    const { ciphertext, capsule } = encrypt(recipientKey, message);
    return new MessageKit(capsule, ciphertext);
  }

  public static fromBytes(bytes: Uint8Array): MessageKit {
    return VersionedParser.fromVersionedBytes(
      MessageKit.getVersionHandler(),
      bytes
    );
  }

  private get header(): Uint8Array {
    return VersionedParser.encodeHeader(MessageKit.BRAND, MessageKit.VERSION);
  }

  protected static getVersionHandler(): VersionHandler {
    const oldVersionDeserializers = (): VersionedDeserializers<Versioned> => {
      return {};
    };
    const currentVersionDeserializer: Deserializer = <T extends Versioned>(
      bytes: Uint8Array
    ): T => {
      const [capsule, remainder] = split(bytes, CAPSULE_LENGTH);
      const [ciphertext, _] = decodeVariableLengthMessage(remainder);
      return new MessageKit(
        Capsule.fromBytes(capsule),
        ciphertext
      ) as unknown as T;
    };
    return {
      oldVersionDeserializers,
      currentVersionDeserializer,
      brand: MessageKit.BRAND,
      version: MessageKit.VERSION,
    };
  }

  public toBytes(): Uint8Array {
    return new Uint8Array([
      ...this.header,
      ...this.capsule.toBytes(),
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
