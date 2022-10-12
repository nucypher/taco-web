import { MessageKit, PublicKey, SecretKey } from '@nucypher/nucypher-core';

import { ConditionSet } from '../policies/conditions';
import { toBytes } from '../utils';

export class Enrico {
  public readonly policyEncryptingKey: PublicKey;
  public readonly verifyingKey: PublicKey;
  public conditions?: ConditionSet;

  constructor(
    policyEncryptingKey: PublicKey,
    verifyingKey?: PublicKey,
    conditions?: ConditionSet
  ) {
    this.policyEncryptingKey = policyEncryptingKey;
    this.verifyingKey = verifyingKey ?? SecretKey.random().publicKey();
    this.conditions = conditions;
  }

  public encryptMessage(
    plaintext: Uint8Array | string,
    currentConditions?: ConditionSet
  ): MessageKit {
    if (!currentConditions) {
      currentConditions = this.conditions;
    }
    return new MessageKit(
      this.policyEncryptingKey,
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext),
      currentConditions?.toBuffer()
    );
  }
}
