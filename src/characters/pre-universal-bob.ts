import {
  Conditions,
  EncryptedTreasureMap,
  MessageKit,
  PublicKey,
  SecretKey,
  Signer,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { ConditionSet } from '../conditions';
import { Keyring } from '../keyring';
import { PolicyMessageKit } from '../kits/message';
import { RetrievalResult } from '../kits/retrieval';
import { base64ToU8Receiver, bytesEquals, toJson, zip } from '../utils';

import { Porter } from './porter';

type PreTDecDecrypterJSON = {
  porterUri: string;
  policyEncryptingKeyBytes: Uint8Array;
  encryptedTreasureMapBytes: Uint8Array;
  publisherVerifyingKeyBytes: Uint8Array;
  bobSecretKeyBytes: Uint8Array;
};

export class PreTDecDecrypter {
  private readonly porter: Porter;
  private readonly keyring: Keyring;

  // private readonly verifyingKey: Keyring;

  constructor(
    porterUri: string,
    private readonly policyEncryptingKey: PublicKey,
    readonly encryptedTreasureMap: EncryptedTreasureMap,
    private readonly publisherVerifyingKey: PublicKey,
    secretKey: SecretKey
    // verifyingKey: SecretKey
  ) {
    this.porter = new Porter(porterUri);
    this.keyring = new Keyring(secretKey);
    // this.verifyingKey = new Keyring(verifyingKey);
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
    messageKits: readonly MessageKit[],
    provider: ethers.providers.Web3Provider
  ): Promise<readonly Uint8Array[]> {
    const policyMessageKits = await this.retrieve(messageKits, provider);

    policyMessageKits.forEach((mk: PolicyMessageKit) => {
      if (!mk.isDecryptableByReceiver()) {
        const errorMsg = `Not enough cFrags retrieved to open capsule ${mk.capsule}.`;
        if (Object.values(mk.errors).length > 0) {
          const ursulasWithErrors = Object.entries(mk.errors).map(
            ([address, error]) => `${address} - ${error}`
          );
          throw Error(
            `${errorMsg} Some Ursulas have failed with errors:\n${ursulasWithErrors.join(
              '\n'
            )}`
          );
        } else {
          throw Error(errorMsg);
        }
      }
    });

    return policyMessageKits.map((mk) => this.keyring.decrypt(mk));
  }

  public async retrieve(
    messageKits: readonly MessageKit[],
    provider: ethers.providers.Web3Provider
  ): Promise<readonly PolicyMessageKit[]> {
    const treasureMap = this.encryptedTreasureMap.decrypt(
      this.keyring.secretKey,
      this.publisherVerifyingKey
    );

    // concat into single array of conditions
    const conditions = messageKits
      .map((mk) => mk.conditions)
      .filter((condition): condition is Conditions => !!condition)
      .map((condition) => JSON.parse(condition.toString()))
      .reduce((acc: Record<string, string>[], val) => acc.concat(val), []);

    const conditionContext =
      ConditionSet.fromConditionList(conditions).buildContext(provider);

    const policyMessageKits = messageKits.map((mk) =>
      PolicyMessageKit.fromMessageKit(
        mk,
        this.policyEncryptingKey,
        treasureMap.threshold
      )
    );

    const retrievalKits = policyMessageKits.map((pk) => pk.asRetrievalKit());
    const retrieveCFragsResponses = await this.porter.retrieveCFrags(
      treasureMap,
      retrievalKits,
      this.publisherVerifyingKey,
      this.decryptingKey,
      this.keyring.publicKey,
      conditionContext
    );

    return zip(policyMessageKits, retrieveCFragsResponses).map((pair) => {
      const [messageKit, { cFrags, errors }] = pair;
      const vcFrags = Object.keys(cFrags).map((address) => {
        const verified = cFrags[address].verify(
          messageKit.capsule,
          this.publisherVerifyingKey,
          this.policyEncryptingKey,
          this.decryptingKey
        );
        return [address, verified];
      });
      const retrievalResult = new RetrievalResult(
        Object.fromEntries(vcFrags),
        errors
      );
      return messageKit.withResult(retrievalResult);
    });
  }

  public toObj(): PreTDecDecrypterJSON {
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
    return toJson(this.toObj());
  }

  private static fromObj({
    porterUri,
    policyEncryptingKeyBytes,
    encryptedTreasureMapBytes,
    publisherVerifyingKeyBytes,
    bobSecretKeyBytes,
  }: PreTDecDecrypterJSON) {
    return new PreTDecDecrypter(
      porterUri,
      PublicKey.fromCompressedBytes(policyEncryptingKeyBytes),
      EncryptedTreasureMap.fromBytes(encryptedTreasureMapBytes),
      PublicKey.fromCompressedBytes(publisherVerifyingKeyBytes),
      SecretKey.fromBEBytes(bobSecretKeyBytes)
    );
  }

  public static fromJSON(json: string) {
    const config = JSON.parse(json, base64ToU8Receiver);
    return PreTDecDecrypter.fromObj(config);
  }

  public equals(other: tDecDecrypter): boolean {
    return (
      this.porter.porterUrl.toString() === other.porter.porterUrl.toString() &&
      bytesEquals(
        this.policyEncryptingKey.toCompressedBytes(),
        other.policyEncryptingKey.toCompressedBytes()
      ) &&
      bytesEquals(
        this.encryptedTreasureMap.toBytes(),
        other.encryptedTreasureMap.toBytes()
      ) &&
      bytesEquals(
        this.publisherVerifyingKey.toCompressedBytes(),
        other.publisherVerifyingKey.toCompressedBytes()
      )
    );
  }
}
