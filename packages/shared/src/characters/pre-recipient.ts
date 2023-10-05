import {
  Conditions,
  EncryptedTreasureMap,
  MessageKit,
  PublicKey,
  SecretKey,
  Signer,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { ConditionContext, ConditionExpression } from '../conditions';
import { Keyring } from '../keyring';
import { PolicyMessageKit } from '../kits/message';
import { RetrievalResult } from '../kits/retrieval';
import { PorterClient } from '../porter';
import { base64ToU8Receiver, toJSON, zip } from '../utils';

export type PreDecrypterJSON = {
  porterUri: string;
  policyEncryptingKeyBytes: Uint8Array;
  encryptedTreasureMapBytes: Uint8Array;
  publisherVerifyingKeyBytes: Uint8Array;
  bobSecretKeyBytes: Uint8Array;
};

export class PreDecrypter {
  // private readonly verifyingKey: Keyring;

  constructor(
    private readonly porter: PorterClient,
    private readonly keyring: Keyring,
    private readonly policyEncryptingKey: PublicKey,
    private readonly publisherVerifyingKey: PublicKey,
    private readonly encryptedTreasureMap: EncryptedTreasureMap,
  ) {}

  public static create(
    porterUri: string,
    secretKey: SecretKey,
    policyEncryptingKey: PublicKey,
    publisherVerifyingKey: PublicKey,
    encryptedTreasureMap: EncryptedTreasureMap,
  ): PreDecrypter {
    return new PreDecrypter(
      new PorterClient(porterUri),
      new Keyring(secretKey),
      policyEncryptingKey,
      publisherVerifyingKey,
      encryptedTreasureMap,
    );
  }

  public get decryptingKey(): PublicKey {
    return this.keyring.publicKey;
  }

  public get signer(): Signer {
    return this.keyring.signer;
  }

  public decrypt(messageKit: MessageKit | PolicyMessageKit): Uint8Array {
    return this.keyring.decrypt(messageKit);
  }

  public async retrieveAndDecrypt(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    messageKits: readonly MessageKit[],
  ): Promise<readonly Uint8Array[]> {
    const policyMessageKits = await this.retrieve(
      provider,
      signer,
      messageKits,
    );

    policyMessageKits.forEach((mk: PolicyMessageKit) => {
      if (!mk.isDecryptableByReceiver()) {
        const errorMsg = `Not enough cFrags retrieved to open capsule ${mk.capsule}.`;
        if (Object.values(mk.errors).length > 0) {
          const ursulasWithErrors = Object.entries(mk.errors).map(
            ([address, error]) => `${address} - ${error}`,
          );
          throw Error(
            `${errorMsg} Some Ursulas have failed with errors:\n${ursulasWithErrors.join(
              '\n',
            )}`,
          );
        } else {
          throw Error(errorMsg);
        }
      }
    });

    return policyMessageKits.map((mk) => this.keyring.decrypt(mk));
  }

  public async retrieve(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    messageKits: readonly MessageKit[],
  ): Promise<readonly PolicyMessageKit[]> {
    const treasureMap = this.encryptedTreasureMap.decrypt(
      this.keyring.secretKey,
      this.publisherVerifyingKey,
    );

    // concat into single array of conditions
    const conditions = messageKits
      .map((mk) => mk.conditions)
      .filter((condition): condition is Conditions => !!condition)
      .map((condition) => ConditionExpression.fromJSON(condition.toString()))
      .reduce((acc: ConditionExpression[], val) => acc.concat(val), [])
      .map((condExpr: ConditionExpression) => condExpr.condition);

    const conditionContext = new ConditionContext(
      provider,
      conditions,
      {},
      signer,
    );

    const policyMessageKits = messageKits.map((mk) =>
      PolicyMessageKit.fromMessageKit(
        mk,
        this.policyEncryptingKey,
        treasureMap.threshold,
      ),
    );

    const retrievalKits = policyMessageKits.map((pk) => pk.asRetrievalKit());
    const conditionContextJSON = conditionContext
      ? await conditionContext.toJson()
      : undefined;
    const retrieveCFragsResponses = await this.porter.retrieveCFrags(
      treasureMap,
      retrievalKits,
      this.publisherVerifyingKey,
      this.decryptingKey,
      this.keyring.publicKey,
      conditionContextJSON,
    );

    return zip(policyMessageKits, retrieveCFragsResponses).map((pair) => {
      const [messageKit, { cFrags, errors }] = pair;
      const vcFrags = Object.keys(cFrags).map((address) => {
        const verified = cFrags[address].verify(
          messageKit.capsule,
          this.publisherVerifyingKey,
          this.policyEncryptingKey,
          this.decryptingKey,
        );
        return [address, verified];
      });
      const retrievalResult = new RetrievalResult(
        Object.fromEntries(vcFrags),
        errors,
      );
      return messageKit.withResult(retrievalResult);
    });
  }

  public toObj(): PreDecrypterJSON {
    return {
      porterUri: this.porter.porterUrl.toString(),
      policyEncryptingKeyBytes: this.policyEncryptingKey.toCompressedBytes(),
      encryptedTreasureMapBytes: this.encryptedTreasureMap.toBytes(),
      publisherVerifyingKeyBytes:
        this.publisherVerifyingKey.toCompressedBytes(),
      bobSecretKeyBytes: this.keyring.secretKey.toBEBytes(),
    };
  }

  public toJSON(): string {
    return toJSON(this.toObj());
  }

  public static fromObj({
    porterUri,
    policyEncryptingKeyBytes,
    encryptedTreasureMapBytes,
    publisherVerifyingKeyBytes,
    bobSecretKeyBytes,
  }: PreDecrypterJSON) {
    return new PreDecrypter(
      new PorterClient(porterUri),
      new Keyring(SecretKey.fromBEBytes(bobSecretKeyBytes)),
      PublicKey.fromCompressedBytes(policyEncryptingKeyBytes),
      PublicKey.fromCompressedBytes(publisherVerifyingKeyBytes),
      EncryptedTreasureMap.fromBytes(encryptedTreasureMapBytes),
    );
  }

  public static fromJSON(json: string) {
    const config = JSON.parse(json, base64ToU8Receiver);
    return PreDecrypter.fromObj(config);
  }

  public equals(other: PreDecrypter): boolean {
    return [
      this.porter.porterUrl.toString() === other.porter.porterUrl.toString(),
      this.policyEncryptingKey.equals(other.policyEncryptingKey),
      this.encryptedTreasureMap.equals(other.encryptedTreasureMap),
      this.publisherVerifyingKey.equals(other.publisherVerifyingKey),
    ].every(Boolean);
  }
}
