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
import { PorterClient } from '../porter';
import { zip } from '../utils';

export class RemoteBob {
  private constructor(
    public readonly decryptingKey: PublicKey,
    public readonly verifyingKey: PublicKey,
  ) {}

  public static fromKeys(
    decryptingKey: PublicKey | Uint8Array,
    verifyingKey: PublicKey | Uint8Array,
  ): RemoteBob {
    const dk =
      decryptingKey instanceof PublicKey
        ? decryptingKey
        : PublicKey.fromCompressedBytes(decryptingKey);
    const vk =
      verifyingKey instanceof PublicKey
        ? verifyingKey
        : PublicKey.fromCompressedBytes(verifyingKey);
    return new RemoteBob(dk, vk);
  }
}

export class Bob {
  private readonly keyring: Keyring;

  constructor(secretKey: SecretKey) {
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

  public static fromSecretKey(secretKey: SecretKey): Bob {
    return new Bob(secretKey);
  }

  public decrypt(messageKit: MessageKit | PolicyMessageKit): Uint8Array {
    return this.keyring.decrypt(messageKit);
  }

  public async retrieveAndDecrypt(
    porterUri: string,
    policyEncryptingKey: PublicKey,
    publisherVerifyingKey: PublicKey,
    messageKits: readonly MessageKit[],
    encryptedTreasureMap: EncryptedTreasureMap,
  ): Promise<readonly Uint8Array[]> {
    const policyMessageKits = await this.retrieve(
      porterUri,
      policyEncryptingKey,
      publisherVerifyingKey,
      messageKits,
      encryptedTreasureMap,
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
    porterUri: string,
    policyEncryptingKey: PublicKey,
    publisherVerifyingKey: PublicKey,
    messageKits: readonly MessageKit[],
    encryptedTreasureMap: EncryptedTreasureMap,
  ): Promise<readonly PolicyMessageKit[]> {
    const treasureMap = encryptedTreasureMap.decrypt(
      this.keyring.secretKey,
      publisherVerifyingKey,
    );

    const policyMessageKits = messageKits.map((mk) =>
      PolicyMessageKit.fromMessageKit(
        mk,
        policyEncryptingKey,
        treasureMap.threshold,
      ),
    );

    const retrievalKits = policyMessageKits.map((pk) => pk.asRetrievalKit());
    const porter = new PorterClient(porterUri);
    const retrieveCFragsResponses = await porter.retrieveCFrags(
      treasureMap,
      retrievalKits,
      publisherVerifyingKey,
      this.decryptingKey,
      this.verifyingKey,
    );

    return zip(policyMessageKits, retrieveCFragsResponses).map((pair) => {
      const [messageKit, { cFrags, errors }] = pair;
      const vcFrags = Object.keys(cFrags).map((address) => {
        const verified = cFrags[address].verify(
          messageKit.capsule,
          publisherVerifyingKey,
          policyEncryptingKey,
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
}
