import { MessageKit, PublicKey, SecretKey } from '@nucypher/nucypher-core';

import { Keyring } from '../keyring';
import { ConditionSet } from '../policies/conditions';
import { toBytes } from '../utils';

export class Enrico {
  public readonly policyEncryptingKey: PublicKey;
  private readonly keyring: Keyring;
  public conditions?: ConditionSet;

  constructor(
    policyEncryptingKey: PublicKey,
    verifyingKey?: SecretKey,
    conditions?: ConditionSet
  ) {
    this.policyEncryptingKey = policyEncryptingKey;
    this.keyring = new Keyring(verifyingKey ?? SecretKey.random());
    this.conditions = conditions;
  }

  public get verifyingKey(): PublicKey {
    return this.keyring.publicKey;
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
      currentConditions ? currentConditions.toWASMConditions() : null
    );
  }
}
