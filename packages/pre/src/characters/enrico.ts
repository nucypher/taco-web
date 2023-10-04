import { MessageKit, PublicKey, SecretKey } from '@nucypher/nucypher-core';
import { toBytes } from '@nucypher/shared';

import { Keyring } from '../keyring';

export class Enrico {
  public readonly encryptingKey: PublicKey;
  private readonly keyring: Keyring;

  constructor(encryptingKey: PublicKey, verifyingKey?: SecretKey) {
    this.encryptingKey = encryptingKey;
    this.keyring = new Keyring(verifyingKey ?? SecretKey.random());
  }

  public get verifyingKey(): PublicKey {
    return this.keyring.publicKey;
  }

  public encryptMessage(plaintext: Uint8Array | string): MessageKit {
    return new MessageKit(
      this.encryptingKey,
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext),
      null,
    );
  }
}
