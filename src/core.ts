import {
  Capsule,
  MessageKit as CoreMessageKit,
  RetrievalKit as CoreRetrievalKit,
  PublicKey,
  SecretKey,
} from '@nucypher/nucypher-core';

import { ConditionSet } from './policies/conditions';
import { toBytes } from './utils';

export class ConditionsIntegrator {
  static delimiter = 188;
  public readonly outputBytes: Uint8Array;

  constructor(nativeBytes: Uint8Array, conditions?: ConditionSet) {
    const conditionBytes = Buffer.from(conditions ? conditions.toBase64() : []);

    this.outputBytes = Uint8Array.from([
      ...nativeBytes,
      ...Uint8Array.from([ConditionsIntegrator.delimiter]),
      ...conditionBytes,
    ]);
  }

  public toBase64 = () => {
    return Buffer.from(this.outputBytes).toString('base64');
  };

  static parse(bytes: Uint8Array) {
    if (bytes.lastIndexOf(ConditionsIntegrator.delimiter) > 0) {
      const messagekitBytes = bytes.slice(
        0,
        bytes.lastIndexOf(ConditionsIntegrator.delimiter)
      );
      const conditionsBytes = bytes.slice(
        bytes.lastIndexOf(ConditionsIntegrator.delimiter) + 1
      );
      return { messagekitBytes, conditionsBytes };
    }
    return { messagekitBytes: bytes, conditionsBytes: undefined };
  }
}

export class MessageKit extends CoreMessageKit {
  public readonly conditions?: ConditionSet;

  constructor(
    policyEncryptingKey: PublicKey,
    plaintext: Uint8Array,
    decryptionConditions?: ConditionSet
  ) {
    super(
      policyEncryptingKey,
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext)
    );

    this.conditions = decryptionConditions;
  }

  public toBytes = () => {
    const mkBytes = super.toBytes();
    return new ConditionsIntegrator(mkBytes, this.conditions).outputBytes;
  };
}

export class RetrievalKit extends CoreRetrievalKit {
  constructor(
    public coreInstance: CoreRetrievalKit,
    public conditions?: ConditionSet
  ) {
    super();
  }

  static fromMessageKit(messageKit: MessageKit) {
    const { messagekitBytes, conditionsBytes } = ConditionsIntegrator.parse(
      messageKit.toBytes()
    );

    const messagekit = MessageKit.fromBytes(messagekitBytes);

    const conditions =
      conditionsBytes !== undefined && conditionsBytes.length
        ? ConditionSet.fromBytes(conditionsBytes)
        : undefined;

    const coreInstance = CoreRetrievalKit.fromMessageKit(messagekit);

    return new RetrievalKit(coreInstance, conditions);
  }

  public toBytes = () => {
    const superBytes = this.coreInstance.toBytes();
    return new ConditionsIntegrator(superBytes, this.conditions).outputBytes;
  };
}
