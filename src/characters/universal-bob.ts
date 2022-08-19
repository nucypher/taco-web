import { sha256 } from '@ethersproject/sha2';
import {
  EncryptedTreasureMap,
  MessageKit,
  PublicKey,
  SecretKey,
  Signer,
} from '@nucypher/nucypher-core';
import { utils as ethersUtils } from 'ethers';

import { Keyring } from '../keyring';
import { PolicyMessageKit } from '../kits/message';
import { RetrievalResult } from '../kits/retrieval';
import { ConditionSet } from '../policies/conditions';
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

  private async authWithSignature(
    web3Provider: Web3Provider,
    messageKits: readonly MessageKit[],
    condition: ConditionSet,
  ): Promise<string> {

    let mkBytes = new Uint8Array();
    for (const mk of messageKits) {
      mkBytes = Buffer.concat([mkBytes, mk.toBytes()]);
    }
    const mkHash = sha256(mkBytes);

    const salt = ethersUtils.randomBytes(32);
    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "salt", type: "bytes32" },
        ],
        Condition: [
          { name: "address", type: "address" },
          { name: "condition", type: "string" },
          { name: "messageKitsHash", type: "bytes32" },
        ]
      },
      domain: {
        name: 'tDec',
        version: '1',
        chainId: 1,
        salt,
      },
      message: {
        address: web3Provider.signer._address,
        condition: condition.toJSON(),
        messageKitsHash: mkHash,
      }
    }

    return web3Provider.signer._signTypedData(typedData.domain, typedData.types, typedData.message);
  }

  public async retrieveAndDecrypt(
    messageKits: readonly MessageKit[],
    web3Provider: Web3Provider,
    condition: ConditionSet,
  ): Promise<readonly Uint8Array[]> {
    // TODO: What do I do with this signature?
    const signature = this.authWithSignature(web3Provider, messageKits, condition);

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
