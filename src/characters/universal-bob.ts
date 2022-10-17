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
import { ConditionContext } from '../policies/conditions';
import { zip } from '../utils';

import { Porter } from './porter';

export class tDecDecrypter {
  private readonly porter: Porter;
  private readonly keyring: Keyring;
  // private readonly verifyingKey: Keyring;

  constructor(
    porterUri: string,
    private readonly policyEncryptingKey: PublicKey,
    readonly encryptedTreasureMap: EncryptedTreasureMap,
    private readonly publisherVerifyingKey: PublicKey,
    secretKey: SecretKey,
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
    conditionContext: ConditionContext
  ): Promise<readonly Uint8Array[]> {
    const policyMessageKits = await this.retrieve(
      messageKits,
      conditionContext
    );

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
    conditionContext: ConditionContext
  ): Promise<readonly PolicyMessageKit[]> {
    const treasureMap = this.encryptedTreasureMap.decrypt(
      this.keyring.secretKey,
      this.publisherVerifyingKey
    );

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
}
