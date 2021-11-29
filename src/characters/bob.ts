import { PublicKey, Signer } from 'umbral-pre';

import { NucypherKeyring } from '../crypto/keyring';
import { DecryptingPower, SigningPower } from '../crypto/powers';
import { MessageKit, PolicyMessageKit } from '../kits/message';
import { RetrievalResult } from '../kits/retrieval';
import { EncryptedTreasureMap } from '../policies/collections';
import { Configuration } from '../types';
import { zip } from '../utils';

import { Porter } from './porter';

/**
 * RemoteBob
 *
 * Represents a remote Bob that other characters may interact with.
 */
export class RemoteBob {
  private constructor(
    public readonly decryptingKey: PublicKey,
    public readonly verifyingKey: PublicKey
  ) {}

  /**
   * Construct `RemoteBob` from `Bob`'s public parameters.
   *
   * @param decryptingKey
   * @param verifyingKey
   */
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

/**
 * Bob - "The Data Recipient"
 */
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
    secretKey: Uint8Array
  ): Bob {
    const keyring = new NucypherKeyring(secretKey);
    const signingPower = keyring.deriveSigningPower();
    const decryptingPower = keyring.deriveDecryptingPower();
    return new Bob(config, signingPower, decryptingPower);
  }

  public decrypt(messageKit: MessageKit | PolicyMessageKit): Uint8Array {
    return this.decryptingPower.decrypt(messageKit);
  }

  /**
   * Retrieve and decrypt encrypted messages using treasure map.
   *
   * @param policyEncryptingKey Policy's encrypting key
   * @param publisherVerifyingKey Alice's verifying key
   * @param messageKits Encrypted messages
   * @param encryptedTreasureMap Encrypted treasure map
   */
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

  private async retrieve(
    policyEncryptingKey: PublicKey,
    publisherVerifyingKey: PublicKey,
    messageKits: MessageKit[],
    encryptedTreasureMap: EncryptedTreasureMap
  ): Promise<PolicyMessageKit[]> {
    const treasureMap = encryptedTreasureMap
      .decrypt(this)
      .verify(this.decryptingKey, publisherVerifyingKey);

    const policyMessageKits = messageKits.map((mk) =>
      mk.asPolicyKit(policyEncryptingKey, treasureMap.threshold)
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
