import {
  EncryptedTreasureMap,
  MessageKit,
  PublicKey,
  SecretKey,
  Signer,
} from '@nucypher/nucypher-core';

import { NucypherKeyring } from '../crypto/keyring';
import { DecryptingPower, SigningPower } from '../crypto/powers';
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

  constructor(
    private readonly config: Configuration,
    private readonly signingPower: SigningPower,
    private readonly decryptingPower: DecryptingPower
  ) {
    this.config = config;
    this.porter = new Porter(config.porterUri);
    this.signingPower = signingPower;
    this.decryptingPower = decryptingPower;
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

  public static fromSecretKey(
    config: Configuration,
    secretKey: SecretKey
  ): Bob {
    const keyring = new NucypherKeyring(secretKey);
    const signingPower = keyring.deriveSigningPower();
    const decryptingPower = keyring.deriveDecryptingPower();
    return new Bob(config, signingPower, decryptingPower);
  }

  public decrypt(messageKit: MessageKit | PolicyMessageKit): Uint8Array {
    return this.decryptingPower.decrypt(messageKit);
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

    return policyMessageKits.map((mk) => this.decryptingPower.decrypt(mk));
  }

  public async retrieve(
    policyEncryptingKey: PublicKey,
    publisherVerifyingKey: PublicKey,
    messageKits: MessageKit[],
    encryptedTreasureMap: EncryptedTreasureMap
  ): Promise<PolicyMessageKit[]> {
    const treasureMap = encryptedTreasureMap.decrypt(
      this.decryptingPower.secretKey,
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
