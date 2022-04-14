import { MessageKit, PublicKey, SecretKey } from '@nucypher/nucypher-core';

import { toBytes } from '../utils';

export class Enrico {
  public readonly policyEncryptingKey: PublicKey;
  public readonly verifyingKey: PublicKey;

  constructor(policyEncryptingKey: PublicKey, verifyingKey?: PublicKey) {
    this.policyEncryptingKey = policyEncryptingKey;
    this.verifyingKey = verifyingKey ?? SecretKey.random().publicKey();
  }

  public encryptMessage(plaintext: Uint8Array | string): MessageKit {
    return new MessageKit(
      this.policyEncryptingKey,
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext)
    );
  }
}
