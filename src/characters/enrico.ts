import {
  Ciphertext,
  DkgPublicKey,
  ferveoEncrypt,
  MessageKit,
  PublicKey,
  SecretKey,
} from '@nucypher/nucypher-core';
import { AES } from 'crypto-js';

import { ConditionExpression, ConditionExpressionJSON } from '../conditions';
import { Keyring } from '../keyring';
import {
  bytesEquals,
  fromBase64,
  fromBytes,
  objectEquals,
  toBase64,
  toBytes,
} from '../utils';

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
    withConditions?: ConditionExpression
  ): { ciphertext: Ciphertext; aad: Uint8Array } {
    if (!withConditions) {
      withConditions = this.conditions;
    }

    if (!withConditions) {
      throw new Error('Conditions are required for CBD encryption.');
    }

    if (!(this.encryptingKey instanceof DkgPublicKey)) {
      throw new Error('Wrong key type. Use encryptMessagePre instead.');
    }

    const aad = withConditions.asAad();
    const ciphertext = ferveoEncrypt(
      plaintext instanceof Uint8Array ? plaintext : toBytes(plaintext),
      aad,
      this.encryptingKey
    );
    return { ciphertext, aad };
  }

  public async encapsulateCbd(
    message: string,
    passphrase: string,
    withConditions?: ConditionExpression
  ): Promise<ThresholdMessageKit> {
    const bulkCiphertext = AES.encrypt(message, passphrase).toString();

    const { ciphertext, aad } = this.encryptMessageCbd(
      passphrase,
      withConditions
    );

    return new ThresholdMessageKit(
      ciphertext,
      aad,
      bulkCiphertext,
      withConditions || this.conditions
    );
  }
}

export class ThresholdMessageKit {
  private static readonly SEPARATOR = ';';

  constructor(
    public keyCiphertext: Ciphertext,
    public keyAad: Uint8Array,
    public bulkCiphertext: string, // OpenSSL-compatible string
    public conditions?: ConditionExpression,
    public metadata: Record<string, string> = {}
  ) {}

  public toObj(): ThresholdMessageKitJSON {
    return {
      keyCiphertext: toBase64(this.keyCiphertext.toBytes()),
      keyAad: toBase64(this.keyAad),
      bulkCiphertext: this.bulkCiphertext,
      conditions: this.conditions ? this.conditions.toObj() : undefined,
      metadata: this.metadata,
    };
  }

  public toJson(): string {
    return JSON.stringify(this.toObj());
  }

  public toBytes(): Uint8Array {
    const bulkCiphertextBytes = toBytes(this.bulkCiphertext);
    const separator = toBytes(ThresholdMessageKit.SEPARATOR);
    // bulkCiphertext will be serialized separately
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bulkCiphertext: _, ...tmkMeta } = this.toObj();
    const tmkMetaBytes = toBytes(JSON.stringify(tmkMeta));

    return new Uint8Array([
      ...tmkMetaBytes,
      ...separator,
      ...bulkCiphertextBytes,
    ]);
  }

  public static fromObj({
    keyCiphertext,
    keyAad,
    bulkCiphertext,
    conditions,
    metadata,
  }: ThresholdMessageKitJSON): ThresholdMessageKit {
    return new ThresholdMessageKit(
      Ciphertext.fromBytes(fromBase64(keyCiphertext)),
      fromBase64(keyAad),
      bulkCiphertext,
      conditions ? ConditionExpression.fromObj(conditions) : undefined,
      metadata
    );
  }

  public static fromJson(json: string): ThresholdMessageKit {
    return ThresholdMessageKit.fromObj(JSON.parse(json));
  }

  public static fromBytes(bytes: Uint8Array): ThresholdMessageKit {
    const separator = toBytes(ThresholdMessageKit.SEPARATOR);
    const separatorIndex = bytes.indexOf(separator[0]);
    const tmkMetaBytes = bytes.slice(0, separatorIndex);
    const bulkCiphertextBytes = bytes.slice(separatorIndex + separator.length);

    const tmkMeta: ThresholdMessageKitJSON = JSON.parse(
      fromBytes(tmkMetaBytes)
    );
    const { keyCiphertext, keyAad, conditions, metadata } = tmkMeta;

    return new ThresholdMessageKit(
      Ciphertext.fromBytes(fromBase64(keyCiphertext)),
      fromBase64(keyAad),
      fromBytes(bulkCiphertextBytes),
      conditions ? ConditionExpression.fromObj(conditions) : undefined,
      metadata
    );
  }

  public equals(other: ThresholdMessageKit): boolean {
    return [
      this.keyCiphertext.equals(other.keyCiphertext),
      bytesEquals(this.keyAad, other.keyAad),
      this.bulkCiphertext === other.bulkCiphertext,
      other.conditions
        ? this.conditions?.equals(other.conditions)
        : !this.conditions,
      objectEquals(this.metadata, other.metadata),
    ].every(Boolean);
  }
}

export type ThresholdMessageKitJSON = {
  keyCiphertext: string;
  keyAad: string;
  bulkCiphertext: string;
  conditions?: ConditionExpressionJSON;
  metadata: Record<string, string>;
};
