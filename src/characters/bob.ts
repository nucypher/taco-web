import {
  Capsule,
  CapsuleWithFrags,
  PublicKey,
  Signer,
  VerifiedCapsuleFrag,
} from 'umbral-pre';

import { verifySignature } from '../crypto/api';
import {
  SIGNATURE_HEADER_BYTES_LENGTH,
  SIGNATURE_HEADER_HEX,
  SIGNATURE_LENGTH,
} from '../crypto/constants';
import { NucypherKeyring } from '../crypto/keyring';
import { DecryptingPower, SigningPower } from '../crypto/powers';
import {
  MessageKit,
  PolicyMessageKit,
  ReencryptedMessageKit,
} from '../kits/message';
import {
  EncryptedTreasureMap,
  PublishedTreasureMap,
  TreasureMap,
  WorkOrder,
} from '../policies/collections';
import { Configuration } from '../types';
import { bytesEqual, toHexString } from '../utils';

import { Enrico } from './enrico';
import { Porter } from './porter';

export class Bob {
  public readonly treasureMaps: Record<string, PublishedTreasureMap>;
  private readonly config: Configuration;
  private readonly porter: Porter;
  private readonly signingPower: SigningPower;
  private readonly decryptingPower: DecryptingPower;

  constructor(
    config: Configuration,
    signingPower: SigningPower,
    decryptingPower: DecryptingPower
  ) {
    this.config = config;
    this.porter = new Porter(config.porterUri);
    this.signingPower = signingPower;
    this.decryptingPower = decryptingPower;
    this.treasureMaps = {};
  }

  public get encryptingPublicKey(): PublicKey {
    return this.decryptingPower.publicKey;
  }

  public get verifyingKey(): PublicKey {
    return this.signingPower.publicKey;
  }

  public get signer(): Signer {
    return this.signingPower.signer;
  }

  static fromPublicKeys(
    config: Configuration,
    verifyingKey: PublicKey,
    encryptingKey: PublicKey
  ): Bob {
    const signingPower = SigningPower.fromPublicKey(verifyingKey);
    const decryptingPower = DecryptingPower.fromPublicKey(encryptingKey);
    return new Bob(config, signingPower, decryptingPower);
  }

  public static fromKeyring(
    config: Configuration,
    keyring: NucypherKeyring
  ): Bob {
    const signingPower = keyring.deriveSigningPower();
    const decryptingPower = keyring.deriveDecryptingPower();
    return new Bob(config, signingPower, decryptingPower);
  }

  public async retrieve(
    label: string,
    policyEncryptingKey: PublicKey,
    publisherVerifyingKey: PublicKey,
    messageKit: PolicyMessageKit,
    encryptedTreasureMap: EncryptedTreasureMap
  ): Promise<Uint8Array[]> {
    const enrico = new Enrico(
      policyEncryptingKey,
      messageKit.senderVerifyingKey
    );
    const messageKits = [messageKit];
    const treasureMap = encryptedTreasureMap.decrypt(
      this,
      publisherVerifyingKey
    );

    // Perform sanity checks
    messageKits.forEach((mk) =>
      messageKit.ensureCorrectSender(enrico, publisherVerifyingKey)
    );

    // Assemble WorkOrders
    // TODO: How to test correctness with umbral-pre-wasm?
    const correctnessKeys: Record<string, any> = {};
    messageKits.forEach((mk) => {
      const capsuleId = mk.capsule.toString();
      correctnessKeys[capsuleId] = {
        receiving: this.decryptingPower.publicKey,
        verifying: publisherVerifyingKey,
      };
    });

    // TODO: Do we also want to handle incomplete work orders? Is Porter keeping track of them?
    const capsulesToActivate = messageKits.map((mk) => mk.capsule);
    const workOrders = await this.workOrdersForCapsules(
      capsulesToActivate,
      treasureMap,
      publisherVerifyingKey
    );

    const cFrags = await this.executeWorkOrders(workOrders, treasureMap.m);

    const activatedCapsules = this.activateCapsules(capsulesToActivate, cFrags);

    // Decrypt ciphertexts
    return messageKits.map((messageKit) => {
      const { ciphertext, signature, capsule } = messageKit;
      const reencryptedMessageKit: ReencryptedMessageKit = {
        ciphertext,
        signature,
        capsule: activatedCapsules[capsule.toString()],
        senderVerifyingKey: enrico.verifyingKey,
        recipientPublicKey: enrico.policyEncryptingKey,
      };
      return this.verifyFrom(enrico.verifyingKey, reencryptedMessageKit, true);
    });
  }

  public verifyFrom(
    strangerPublicKey: PublicKey,
    messageKit: MessageKit | PolicyMessageKit | ReencryptedMessageKit,
    decrypt = false,
    providedSignature?: Uint8Array
  ): Uint8Array {
    if (!(messageKit instanceof MessageKit)) {
      const strangerVkBytes = strangerPublicKey.toBytes();
      const verifyingKey = messageKit.senderVerifyingKey.toBytes();
      if (!bytesEqual(strangerVkBytes, verifyingKey)) {
        throw new Error(
          "Stranger public key doesn't match message kit sender."
        );
      }
    }

    let cleartext;
    let message;
    let signatureFromKit;

    if (decrypt) {
      const cleartextWithSignatureHeader =
        this.decryptingPower.decrypt(messageKit);
      const signatureHeaderBytes = cleartextWithSignatureHeader.slice(
        0,
        SIGNATURE_HEADER_BYTES_LENGTH
      );
      const signatureHeader = toHexString(signatureHeaderBytes);

      switch (signatureHeader) {
        case SIGNATURE_HEADER_HEX.SIGNATURE_IS_ON_CIPHERTEXT:
          message = messageKit.ciphertext;
          if (!providedSignature) {
            throw Error(
              "Can't check a signature on the ciphertext if don't provide one"
            );
          }
          signatureFromKit = providedSignature;
          break;
        case SIGNATURE_HEADER_HEX.SIGNATURE_TO_FOLLOW:
          // TODO: This never runs
          cleartext = cleartextWithSignatureHeader.slice(
            SIGNATURE_HEADER_BYTES_LENGTH
          );
          signatureFromKit = cleartext.slice(0, SIGNATURE_LENGTH);
          message = cleartext.slice(SIGNATURE_LENGTH);
          break;
        case SIGNATURE_HEADER_HEX.NOT_SIGNED:
          message = cleartextWithSignatureHeader.slice(
            SIGNATURE_HEADER_BYTES_LENGTH
          );
          break;
        default:
          throw Error(`Unrecognized signature header: ${signatureHeader}`);
      }
    } else {
      // TODO: This never runs
      if (messageKit instanceof PolicyMessageKit) {
        message = messageKit.toBytes();
      } else {
        // TODO: Remove this workaround after implementing ReencryptedMessageKit::toBytes
        // TODO: Should we even distinguish between MessageKits here?
        throw new Error(
          'Expected PolicyMessageKit, received ReencryptedMessageKit instead'
        );
      }
    }

    if (
      providedSignature &&
      signatureFromKit &&
      !bytesEqual(providedSignature, signatureFromKit)
    ) {
      throw Error(
        "Provided signature doesn't match PolicyMessageKit signature"
      );
    }

    signatureFromKit = signatureFromKit ?? providedSignature;
    if (!signatureFromKit) {
      throw Error('Missing signature for PolicyMessageKit');
    }

    const isValid = verifySignature(
      signatureFromKit,
      message,
      strangerPublicKey
    );
    if (!isValid) {
      throw Error('Invalid signature on PolicyMessageKit');
    }

    return message;
  }

  private activateCapsules(
    capsulesToActivate: Capsule[],
    cFrags: VerifiedCapsuleFrag[]
  ): Record<string, CapsuleWithFrags> {
    return Object.fromEntries(
      capsulesToActivate.map((capsule) => {
        let capsuleWithFrags: CapsuleWithFrags;
        cFrags.forEach((cFrag) => {
          capsuleWithFrags = capsuleWithFrags
            ? capsuleWithFrags.withCFrag(cFrag)
            : capsule.withCFrag(cFrag);
        });
        return [capsule.toString(), capsuleWithFrags!];
      })
    );
  }

  private async executeWorkOrders(
    workOrders: WorkOrder[],
    m: number
  ): Promise<VerifiedCapsuleFrag[]> {
    // TODO: Do we need to execute all work orders if we only need m cFrags?
    const cFrags = await Promise.all(
      workOrders
        .map(async (workOrder) => {
          const { cFrag } = await this.porter.executeWorkOrder(workOrder);
          // TODO: Verify `reencryptionSignature`, return null or throw if fails
          return cFrag;
        })
        .filter((maybeCFrag) => !!maybeCFrag)
    );
    if (cFrags.length < m) {
      throw new Error(
        `Failed to get enough cFrags: received ${cFrags.length}, expected ${m}`
      );
    }
    return cFrags;
    // TODO: Return exactly m cFrags here?
    // return cFrags.slice(0, m+1);
  }

  private async workOrdersForCapsules(
    capsules: Capsule[],
    treasureMap: TreasureMap,
    publisherVerifyingKey: PublicKey
  ) {
    const nodeIds = Object.keys(treasureMap.destinations);
    const ursulas = await this.porter.getUrsulas(
      nodeIds.length,
      undefined,
      undefined,
      nodeIds
    );
    const ursulasByNodeId = Object.fromEntries(
      ursulas.map((ursula) => [ursula.checksumAddress, ursula])
    );
    return Object.entries(treasureMap.destinations).map(
      ([nodeId, arrangementId]) => {
        return WorkOrder.constructByBob(
          arrangementId,
          publisherVerifyingKey,
          capsules,
          ursulasByNodeId[nodeId],
          this
        );
      }
    );
  }
}
