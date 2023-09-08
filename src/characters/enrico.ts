import {
  AccessControlPolicy,
  DkgPublicKey,
  encryptForDkg,
  MessageKit,
  PublicKey,
  SecretKey,
  ThresholdMessageKit,
} from '@nucypher/nucypher-core';
import { arrayify, keccak256 } from 'ethers/lib/utils';

import { ConditionExpression } from '../conditions';
import { Keyring } from '../keyring';
import { toBytes } from '../utils';

export class Enrico {
  public readonly encryptingKey: PublicKey | DkgPublicKey;
  private readonly keyring: Keyring;
  public conditions?: ConditionExpression;

  constructor(
    encryptingKey: PublicKey | DkgPublicKey,
    verifyingKey?: SecretKey,
    conditions?: ConditionExpression
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
    withConditions?: ConditionExpression
  ): MessageKit {
    if (!withConditions) {
      withConditions = this.conditions;
    }

    if (!(this.encryptingKey instanceof PublicKey)) {
      throw new Error('Wrong key type. Use encryptMessageCbd instead.');
    }

    return new MessageKit(
      this.encryptingKey,
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext),
      withConditions ? withConditions.toWASMConditions() : null
    );
  }

  public encryptMessageCbd(
    plaintext: Uint8Array | string,
    conditions?: ConditionExpression
  ): ThresholdMessageKit {
    if (!conditions) {
      conditions = this.conditions;
    }

    if (!conditions) {
      throw new Error('Conditions are required for CBD encryption.');
    }

    if (!(this.encryptingKey instanceof DkgPublicKey)) {
      throw new Error('Wrong key type. Use encryptMessagePre instead.');
    }

    const [ciphertext, authenticatedData] = encryptForDkg(
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext),
      this.encryptingKey,
      conditions.toWASMConditions()
    );

    const headerHash = keccak256(ciphertext.header.toBytes());
    const authorization = this.keyring.signer.sign(arrayify(headerHash));
    const acp = new AccessControlPolicy(
      authenticatedData,
      authorization.toBEBytes()
    );

    return new ThresholdMessageKit(ciphertext, acp);
  }
}
