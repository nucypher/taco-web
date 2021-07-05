import { VerifiedCapsuleFrag } from 'umbral-pre';

import { keccakDigest, verifySignature } from '../crypto/api';
import {
  HRAC_LENGTH,
  SIGNATURE_HEADER,
  SIGNATURE_HEADER_LENGTH,
  SIGNATURE_LENGTH,
} from '../crypto/constants';
import { PolicyMessageKit, ReencryptedMessageKit } from '../crypto/kits';
import { DecryptingPower, SigningPower } from '../crypto/powers';
import { PublishedTreasureMap, WorkOrder } from '../policies/collections';
import {
  UmbralCapsule,
  UmbralCapsuleWithFrags,
  UmbralPublicKey,
  UmbralSigner,
} from '../types';
import { Porter } from './porter';
import { NucypherKeyring } from '../crypto/keyring';
import { Enrico } from './enrico';

export class Bob {
  public readonly treasureMaps: Record<string, PublishedTreasureMap>;
  private readonly signingPower: SigningPower;
  private readonly decryptingPower: DecryptingPower;

  constructor(signingPower: SigningPower, decryptingPower: DecryptingPower) {
    this.signingPower = signingPower;
    this.decryptingPower = decryptingPower;
    this.treasureMaps = {};
  }

  static fromPublicKeys(
    verifyingKey: UmbralPublicKey,
    encryptingKey: UmbralPublicKey
  ): Bob {
    const signingPower = SigningPower.fromPublicKey(verifyingKey);
    const decryptingPower = DecryptingPower.fromPublicKey(encryptingKey);
    return new Bob(signingPower, decryptingPower);
  }

  public static fromKeyring(keyring: NucypherKeyring): Bob {
    const signingPower = keyring.deriveSigningPower();
    const decryptingPower = keyring.deriveDecryptingPower();
    return new Bob(signingPower, decryptingPower);
  }

  public get encryptingPublicKey(): UmbralPublicKey {
    return this.decryptingPower.publicKey;
  }

  public get verifyingKey(): UmbralPublicKey {
    return this.signingPower.publicKey;
  }

  public get signer(): UmbralSigner {
    return this.signingPower.signer;
  }

  public async retrieve(
    messageKits: PolicyMessageKit[],
    aliceVerifyingKey: UmbralPublicKey,
    label: string,
    enrico: Enrico,
    maybeTreasureMap?: PublishedTreasureMap
  ): Promise<Buffer[]> {
    let treasureMap = maybeTreasureMap;
    if (!treasureMap) {
      const mapId = this.makeTreasureMapId(aliceVerifyingKey, label);
      treasureMap = this.treasureMaps[mapId];
      if (!treasureMap) {
        throw new Error(`Failed to find a treasure map for map id ${mapId}.`);
      }
    } else {
      // TODO: Repeat this check after the one in joinPolicy?
      this.tryOrient(treasureMap, aliceVerifyingKey);
    }

    // Perform sanity checks

    // messageKits.forEach(mk =>
    //   mk.ensureCorrectSender(enrico, aliceVerifyingKey)
    // );

    // Assemble WorkOrders

    // TODO: How to test correctness with umbral-pre-wasm?
    const correctnessKeys: Record<string, any> = {};
    messageKits.forEach(mk => {
      const capsuleId = mk.capsule.toString();
      correctnessKeys[capsuleId] = {
        receiving: this.decryptingPower.publicKey,
        verifying: aliceVerifyingKey,
      };
    });

    // TODO: Do we also want to handle incomplete work orders? Is Porter keeping track of them?
    const capsulesToActivate = messageKits.map(mk => mk.capsule);
    const workOrders = await this.workOrdersForCapsules(
      capsulesToActivate,
      treasureMap,
      aliceVerifyingKey
    );

    const cFrags = await this.executeWorkOrders(workOrders, treasureMap.m);

    const activatedCapsules = this.activateCapsules(
      workOrders,
      cFrags,
      treasureMap.m
    );

    // Decrypt ciphertexts
    return messageKits.map(messageKit => {
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

  private activateCapsules(
    workOrders: WorkOrder[],
    cFrags: VerifiedCapsuleFrag[],
    m: number
  ): Record<string, UmbralCapsuleWithFrags> {
    const capsules = workOrders
      .flatMap(workOrder => workOrder.tasks)
      .map(task => task.capsule);
    return Object.fromEntries(
      capsules.map(capsule => {
        let capsuleWithFrags: UmbralCapsuleWithFrags | undefined;
        for (const cFrag of cFrags.slice(0, m)) {
          capsuleWithFrags = capsuleWithFrags
            ? capsuleWithFrags.withCFrag(cFrag)
            : capsule.withCFrag(cFrag);
        }
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
        .map(async workOrder => {
          const { cFrag } = await Porter.executeWorkOrder(workOrder);
          // TODO: Verify `reencryptionSignature`, return null or throw if fails
          return cFrag;
        })
        .filter(maybeCFrag => !!maybeCFrag)
    );
    if (cFrags.length < m) {
      throw new Error(
        `Failed to get enough cFrags: received ${cFrags.length}, expected ${m}`
      );
    }
    // TODO: Can we return exactly m cFrags instead of returning all cFrags?
    // return cFrags.slice(0, m);
    return cFrags;
  }

  public async joinPolicy(aliceVerifyingKey: UmbralPublicKey, label: string) {
    await this.getTreasureMap(aliceVerifyingKey, label);
  }

  public verifyFrom(
    strangerPublicKey: UmbralPublicKey,
    messageKit: PolicyMessageKit | ReencryptedMessageKit,
    decrypt: boolean = false,
    providedSignature?: Buffer
  ): Buffer {
    const strangerVkBytes = Buffer.from(strangerPublicKey.toBytes());
    const verifyingKey = Buffer.from(messageKit.senderVerifyingKey.toBytes());
    if (strangerVkBytes.compare(verifyingKey)) {
      throw new Error("Stranger public key doesn't match message kit sender.");
    }

    let cleartext;
    let message;
    let signatureFromKit;

    if (decrypt) {
      const cleartextWithSignatureHeader = this.decryptingPower.decrypt(
        messageKit
      );
      const signatureHeaderBytes = cleartextWithSignatureHeader.slice(
        0,
        SIGNATURE_HEADER_LENGTH
      );
      const signatureHeader = signatureHeaderBytes.toString('hex');

      switch (signatureHeader) {
        case SIGNATURE_HEADER.SIGNATURE_IS_ON_CIPHERTEXT:
          message = messageKit.ciphertext;
          if (!providedSignature) {
            throw Error(
              "Can't check a signature on the ciphertext if don't provide one"
            );
          }
          signatureFromKit = providedSignature;
          break;
        case SIGNATURE_HEADER.SIGNATURE_TO_FOLLOW:
          // TODO: This never runs
          cleartext = cleartextWithSignatureHeader.slice(
            SIGNATURE_HEADER_LENGTH
          );
          signatureFromKit = cleartext.slice(0, SIGNATURE_LENGTH);
          message = cleartext.slice(SIGNATURE_LENGTH);
          break;
        case SIGNATURE_HEADER.NOT_SIGNED:
          message = cleartextWithSignatureHeader.slice(SIGNATURE_HEADER_LENGTH);
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
      providedSignature.compare(signatureFromKit)
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

  private async workOrdersForCapsules(
    capsules: UmbralCapsule[],
    treasureMap: PublishedTreasureMap,
    aliceVerifyingKey: UmbralPublicKey
  ) {
    const nodes = treasureMap.destinations;
    const nodeIds = Object.keys(nodes);
    const ursulas = await Porter.getUrsulas(
      nodeIds.length,
      undefined,
      undefined,
      nodeIds
    );
    const ursulasByNodeId = Object.fromEntries(
      ursulas.map(ursula => [ursula.checksumAddress, ursula])
    );
    return Object.entries(nodes).map(([nodeId, arrangementId]) => {
      return WorkOrder.constructByBob(
        arrangementId,
        aliceVerifyingKey,
        capsules,
        ursulasByNodeId[nodeId],
        this
      );
    });
  }

  private async getTreasureMap(
    aliceVerifyingKey: UmbralPublicKey,
    label: string
  ): Promise<PublishedTreasureMap> {
    const mapId = this.makeTreasureMapId(aliceVerifyingKey, label);
    const treasureMap = await Porter.getTreasureMap(
      mapId,
      this.encryptingPublicKey
    );
    this.tryOrient(treasureMap, aliceVerifyingKey);
    this.treasureMaps[mapId] = treasureMap;
    return treasureMap;
  }

  private tryOrient(
    treasureMap: PublishedTreasureMap,
    aliceVerifyingKey: UmbralPublicKey
  ) {
    treasureMap.orient(aliceVerifyingKey, this);
  }

  private makeTreasureMapId(
    verifyingKey: UmbralPublicKey,
    label: string
  ): string {
    const vkBytes = Buffer.from(verifyingKey.toBytes());
    const hrac = this.makePolicyHrac(vkBytes, label);
    const mapId = keccakDigest(Buffer.concat([vkBytes, hrac]));
    return mapId.toString('hex');
  }

  private makePolicyHrac(verifyingKey: Buffer, label: string) {
    return keccakDigest(
      Buffer.concat([
        verifyingKey,
        this.verifyingKey.toBytes(),
        Buffer.from(label),
      ])
    ).slice(0, HRAC_LENGTH);
  }
}
