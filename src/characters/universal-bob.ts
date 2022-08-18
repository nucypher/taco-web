import { sha256 } from '@ethersproject/sha2';
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
import { zip } from '../utils';
import { Web3Provider } from '../web3';

import { Porter } from './porter';

export class tDecDecrypter {
  private readonly porter: Porter;
  private readonly keyring: Keyring;
  private readonly verifyingKey: Keyring;

  constructor(
    porterUri: string,
    private readonly policyEncryptingKey: PublicKey,
    readonly encryptedTreasureMap: EncryptedTreasureMap,
    private readonly publisherVerifyingKey: PublicKey,
    secretKey: SecretKey,
    verifyingKey: SecretKey
  ) {
    this.porter = new Porter(porterUri);
    this.keyring = new Keyring(secretKey);
    this.verifyingKey = new Keyring(verifyingKey);
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

  private async signMessageKits(
    web3Provider: Web3Provider,
    messageKits: readonly MessageKit[]
  ): Promise<string> {
    let mkBytes = new Uint8Array();
    for (const mk of messageKits) {
      mkBytes = Buffer.concat([mkBytes, mk.toBytes()]);
    }
    const mkHash = sha256(mkBytes);
    return web3Provider.signer.signMessage(mkHash);
  }

  public async retrieveAndDecrypt(
    messageKits: readonly MessageKit[],
    web3Provider: Web3Provider
  ): Promise<readonly Uint8Array[]> {
    // TODO: What do I do with this signature?
    const signedMessageKits = this.signMessageKits(web3Provider, messageKits);

    const policyMessageKits = await this.retrieve(messageKits);

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
    messageKits: readonly MessageKit[]
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
      this.verifyingKey.publicKey
    );

    return zip(policyMessageKits, retrieveCFragsResponses).map((pair) => {
      const [messageKit, cFragResponse] = pair;
      const results = Object.keys(cFragResponse).map((address) => {
        const verified = cFragResponse[address].verify(
          messageKit.capsule,
          this.publisherVerifyingKey,
          this.policyEncryptingKey,
          this.decryptingKey
        );
        return [address, verified];
      });
      const retrievalResult = new RetrievalResult(Object.fromEntries(results));
      return messageKit.withResult(retrievalResult);
    });
  }
}
