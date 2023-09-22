import { MessageKit, PublicKey, SecretKey } from '@nucypher/nucypher-core';
import { ConditionExpression, toBytes } from '@nucypher/shared';

import { Keyring } from '../keyring';

export class Enrico {
  public readonly encryptingKey: PublicKey;
  private readonly keyring: Keyring;
  public conditions?: ConditionExpression | undefined;

  constructor(
    encryptingKey: PublicKey,
    verifyingKey?: SecretKey,
    conditions?: ConditionExpression,
  ) {
    this.encryptingKey = encryptingKey;
    this.keyring = new Keyring(verifyingKey ?? SecretKey.random());
    this.conditions = conditions;
  }

  public get verifyingKey(): PublicKey {
    return this.keyring.publicKey;
  }

  public encryptMessagePre(
    plaintext: Uint8Array | string,
    withConditions?: ConditionExpression,
  ): MessageKit {
    if (!withConditions) {
      withConditions = this.conditions;
    }

    return new MessageKit(
      this.encryptingKey,
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext),
      withConditions ? withConditions.toWASMConditions() : null,
    );
  }
}
