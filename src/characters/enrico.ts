import { PublicKey, SecretKey } from '@nucypher/nucypher-core';

import { MessageKit } from '../core';
import { ConditionSet } from '../policies/conditions';
import { toBytes } from '../utils';

export class Enrico {
  public readonly policyEncryptingKey: PublicKey;
  public readonly verifyingKey: PublicKey;
  public readonly conditions?: ConditionSet;

  constructor(
    policyEncryptingKey: PublicKey,
    verifyingKey?: PublicKey,
    conditions?: ConditionSet
  ) {
    this.policyEncryptingKey = policyEncryptingKey;
    this.verifyingKey = verifyingKey ?? SecretKey.random().publicKey();
    this.conditions = conditions;
  }

  public encryptMessage(plaintext: Uint8Array | string): MessageKit {
    return new MessageKit(
      this.policyEncryptingKey,
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext),
      this.conditions
    );
  }
}
