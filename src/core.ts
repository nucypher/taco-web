import {
  Capsule,
  MessageKit as CoreMessageKit,
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

  static parse(bytes: Buffer) {
    if (bytes.indexOf(ConditionsIntegrator.delimiter) > 0) {
      const messageKit = bytes.slice(
        0,
        bytes.indexOf(ConditionsIntegrator.delimiter)
      );
      const conditions = bytes.slice(
        bytes.indexOf(ConditionsIntegrator.delimiter) + 1
      );
      return { messageKit, conditions };
    }
    return { messageKit: bytes, conditions: null };
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
