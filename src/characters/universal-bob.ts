import {
  Conditions,
  EncryptedTreasureMap,
  MessageKit,
  PublicKey,
  SecretKey,
  Signer,
} from '@nucypher/nucypher-core';

import { Keyring } from '../keyring';
import { PolicyMessageKit } from '../kits/message';
import { RetrievalResult } from '../kits/retrieval';
import { ConditionSet } from '../policies/conditions';
import { base64ToU8Receiver, u8ToBase64Replacer, zip } from '../utils';
import { Web3Provider } from '../web3';

import { Porter } from './porter';

type decrypterJSON = {
  porterUri: string;
  policyEncryptingKeyBytes: Uint8Array;
  encryptedTreasureMapBytes: Uint8Array;
  publisherVerifyingKeyBytes: Uint8Array;
  bobSecretKeyBytes: Uint8Array;
};

export class tDecDecrypter {
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
    provider: Web3Provider
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
    provider: Web3Provider
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
      ConditionSet.fromList(conditions).buildContext(provider);

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

  public toObj(): decrypterJSON {
    return {
      porterUri: this.porter.porterUrl.toString(),
      policyEncryptingKeyBytes: this.policyEncryptingKey.toBytes(),
      encryptedTreasureMapBytes: this.encryptedTreasureMap.toBytes(),
      publisherVerifyingKeyBytes: this.publisherVerifyingKey.toBytes(),
      bobSecretKeyBytes: this.keyring.secretKey.toSecretBytes(),
    };
  }

  public toJSON(): string {
    return JSON.stringify(this.toObj(), u8ToBase64Replacer);
  }

  private static fromObj({
    porterUri,
    policyEncryptingKeyBytes,
    encryptedTreasureMapBytes,
    publisherVerifyingKeyBytes,
    bobSecretKeyBytes,
  }: decrypterJSON) {
    return new tDecDecrypter(
      porterUri,
      PublicKey.fromBytes(policyEncryptingKeyBytes),
      EncryptedTreasureMap.fromBytes(encryptedTreasureMapBytes),
      PublicKey.fromBytes(publisherVerifyingKeyBytes),
      SecretKey.fromBytes(bobSecretKeyBytes)
    );
  }

  public static fromJSON(json: string) {
    const config = JSON.parse(json, base64ToU8Receiver);
    return tDecDecrypter.fromObj(config);
  }
}
