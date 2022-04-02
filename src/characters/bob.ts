import {
  EncryptedTreasureMap,
  MessageKit,
  PublicKey,
  SecretKey,
  Signer,
} from '@nucypher/nucypher-core';

import { Keyring } from '../keyring';
import { PolicyMessageKit } from '../kits/message';
import { RetrievalResult } from '../kits/retrieval';
import { Configuration } from '../types';
import { zip } from '../utils';

import { Porter } from './porter';

export class RemoteBob {
  private constructor(
    public readonly decryptingKey: PublicKey,
    public readonly verifyingKey: PublicKey
  ) {}

  public static fromKeys(
    decryptingKey: PublicKey | Uint8Array,
    verifyingKey: PublicKey | Uint8Array
  ): RemoteBob {
    const dk =
      decryptingKey instanceof PublicKey
        ? decryptingKey
        : PublicKey.fromBytes(decryptingKey);
    const vk =
      verifyingKey instanceof PublicKey
        ? verifyingKey
        : PublicKey.fromBytes(verifyingKey);
    return new RemoteBob(dk, vk);
  }
}

export class Bob {
  private readonly porter: Porter;
  private readonly keyring: Keyring;

  constructor(config: Configuration, secretKey: SecretKey) {
    this.porter = new Porter(config.porterUri);
    this.keyring = new Keyring(secretKey);
  }

  public get decryptingKey(): PublicKey {
    return this.keyring.publicKey;
  }

  public get verifyingKey(): PublicKey {
    return this.keyring.publicKey;
  }

  public get signer(): Signer {
    return this.keyring.signer;
  }

  public static fromSecretKey(
    config: Configuration,
    secretKey: SecretKey
  ): Bob {
    return new Bob(config, secretKey);
  }

  public decrypt(messageKit: MessageKit | PolicyMessageKit): Uint8Array {
    return this.keyring.decrypt(messageKit);
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
          `Not enough cFrags retrieved to open capsule ${mk.capsule}. Was the policy revoked?`
        );
      }
    });

    return policyMessageKits.map((mk) => this.keyring.decrypt(mk));
  }

  public async retrieve(
    policyEncryptingKey: PublicKey,
    publisherVerifyingKey: PublicKey,
    messageKits: MessageKit[],
    encryptedTreasureMap: EncryptedTreasureMap
  ): Promise<PolicyMessageKit[]> {
    const treasureMap = encryptedTreasureMap.decrypt(
      this.keyring.secretKey,
      publisherVerifyingKey
    );

    const policyMessageKits = messageKits.map((mk) =>
      PolicyMessageKit.fromMessageKit(
        mk,
        policyEncryptingKey,
        treasureMap.threshold
      )
    );

    const retrievalKits = policyMessageKits.map((pk) => pk.asRetrievalKit());
    const retrieveCFragsResponses = await this.porter.retrieveCFrags(
      treasureMap,
      retrievalKits,
      publisherVerifyingKey,
      this.decryptingKey,
      this.verifyingKey
    );

    return zip(policyMessageKits, retrieveCFragsResponses).map((pair) => {
      const [messageKit, cFragResponse] = pair;
      const results = Object.keys(cFragResponse).map((address) => {
        const verified = cFragResponse[address].verify(
          messageKit.capsule,
          publisherVerifyingKey,
          policyEncryptingKey,
          this.decryptingKey
        );
        return [address, verified];
      });
      const retrievalResult = new RetrievalResult(Object.fromEntries(results));
      return messageKit.withResult(retrievalResult);
    });
  }
}
