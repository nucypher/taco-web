import { PublicKey, Signer } from 'umbral-pre';

import { verifySignature } from '../crypto/api';
import {
  SIGNATURE_HEADER_BYTES_LENGTH,
  SIGNATURE_HEADER_HEX,
  SIGNATURE_LENGTH,
} from '../crypto/constants';
import { NucypherKeyring } from '../crypto/keyring';
import { DecryptingPower, SigningPower } from '../crypto/powers';
import { MessageKit, PolicyMessageKit } from '../kits/message';
import {
  EncryptedTreasureMap,
  PublishedTreasureMap,
} from '../policies/collections';
import { Configuration } from '../types';
import { bytesEqual, split, toHexString } from '../utils';

import { Porter } from './porter';

export class Bob {
  private readonly treasureMaps: Record<string, PublishedTreasureMap>;
  private readonly config: Configuration;
  private readonly porter: Porter;
  private readonly signingPower: SigningPower;
  private readonly decryptingPower: DecryptingPower;

  constructor(
    config: Configuration,
    signingPower: SigningPower,
    decryptingPower: DecryptingPower
  ) {
    this.config = config;
    this.porter = new Porter(config.porterUri);
    this.signingPower = signingPower;
    this.decryptingPower = decryptingPower;
    this.treasureMaps = {};
  }

  public get decryptingKey(): PublicKey {
    return this.decryptingPower.publicKey;
  }

  public get verifyingKey(): PublicKey {
    return this.signingPower.publicKey;
  }

  public get signer(): Signer {
    return this.signingPower.signer;
  }

  public static fromPublicKeys(
    config: Configuration,
    verifyingKey: PublicKey,
    encryptingKey: PublicKey
  ): Bob {
    const signingPower = SigningPower.fromPublicKey(verifyingKey);
    const decryptingPower = DecryptingPower.fromPublicKey(encryptingKey);
    return new Bob(config, signingPower, decryptingPower);
  }

  public static fromSecretKey(
    config: Configuration,
    secretKey: Uint8Array
  ): Bob {
    const keyring = new NucypherKeyring(secretKey);
    const signingPower = keyring.deriveSigningPower();
    const decryptingPower = keyring.deriveDecryptingPower();
    return new Bob(config, signingPower, decryptingPower);
  }

  public verifyFrom(
    strangerVerifyingKey: PublicKey,
    messageKit: MessageKit | PolicyMessageKit
  ): Uint8Array {
    if (messageKit.senderVerifyingKey) {
      const verifyingKey = messageKit.senderVerifyingKey.toBytes();
      if (!bytesEqual(strangerVerifyingKey.toBytes(), verifyingKey)) {
        throw new Error(
          `This message kit doesn't appear to have come from ${strangerVerifyingKey.toString()}`
        );
      }
    }

    const cleartextWithHeader = this.decryptingPower.decrypt(messageKit);
    const [headerBytes, cleartext] = split(
      cleartextWithHeader,
      SIGNATURE_HEADER_BYTES_LENGTH
    );

    const header = toHexString(headerBytes);
    if (header !== SIGNATURE_HEADER_HEX.SIGNATURE_TO_FOLLOW) {
      throw Error(`Unrecognized signature header: ${header}`);
    }

    const [signature, message] = split(cleartext, SIGNATURE_LENGTH);
    const isValid = verifySignature(signature, message, strangerVerifyingKey);
    if (!isValid) {
      throw Error('Invalid signature on message kit');
    }

    return message;
  }

  public async retrieveAndDecrypt(
    policyEncryptingKey: PublicKey,
    publisherVerifyingKey: PublicKey,
    messageKits: MessageKit[],
    encryptedTreasureMap: EncryptedTreasureMap
  ): Promise<Uint8Array[]> {
    const policyMessageKits = await this.retrieve(
      policyEncryptingKey,
      publisherVerifyingKey,
      messageKits,
      encryptedTreasureMap
    );

    policyMessageKits.forEach((mk) => {
      if (!mk.isDecryptableByReceiver()) {
        throw Error(
          `Not enough cFrags retrieved to open capsule ${mk.capsule}`
        );
      }
    });

    return policyMessageKits.map((mk) =>
      this.verifyFrom(mk.senderVerifyingKey!, mk)
    );
  }

  public async retrieve(
    policyEncryptingKey: PublicKey,
    publisherVerifyingKey: PublicKey,
    messageKits: MessageKit[],
    encryptedTreasureMap: EncryptedTreasureMap
  ): Promise<PolicyMessageKit[]> {
    const treasureMap = encryptedTreasureMap.decrypt(
      this,
      publisherVerifyingKey
    );

    const policyMessageKits = messageKits.map((mk) =>
      mk.asPolicyKit(policyEncryptingKey, treasureMap.threshold)
    );

    const retrievalKits = policyMessageKits.map((pk) => pk.asRetrievalKit());

    const retrievalResults = await this.porter.retrieveCFrags(
      treasureMap,
      retrievalKits,
      publisherVerifyingKey,
      this.decryptingKey,
      this.verifyingKey,
      policyEncryptingKey
    );

    // TODO: Rewrite elegantly
    return policyMessageKits.map((messageKit) => {
      let acc = messageKit;
      retrievalResults.forEach((result) => {
        acc = acc.withResult(result);
      });
      return acc;
    });
  }
}
