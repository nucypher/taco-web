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
  ChecksumAddress,
  UmbralCapsule,
  UmbralPublicKey,
  UmbralSigner,
} from '../types';
import { Enrico } from './enrico';
import { IUrsula, Porter } from './porter';
import { NucypherKeyring } from '../crypto/keyring';

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

  private static reencrypt(workOrder: WorkOrder) {
    throw new Error('Method not implemented.');
  }

  public async retrieve(
    messageKits: PolicyMessageKit[],
    label: string,
    enrico: Enrico,
    aliceVerifyingKey: UmbralPublicKey,
    maybeTreasureMap?: PublishedTreasureMap
  ): Promise<Buffer[]> {
    let treasureMap;
    if (!maybeTreasureMap) {
      const mapId = this.makeTreasureMapId(aliceVerifyingKey, label);
      treasureMap = this.treasureMaps[mapId];
      if (!treasureMap) {
        throw new Error(`Failed to find a treasure map for map id ${mapId}.`);
      }
    } else {
      treasureMap = maybeTreasureMap;
    }

    messageKits.forEach(mk =>
      mk.ensureCorrectSender(enrico, aliceVerifyingKey)
    );

    const capsulesToActivate = new Set(messageKits.map(mk => mk.capsule));

    // TODO: Resolve CFrag confusion by using umbral.CapsuleWithCFrag
    // We assume to have all cfrags attached

    // Assemble WorkOrders

    messageKits.forEach(mk => {
      // TODO: How to check key correctness with umbral-pre-wasm?
      // const capsule = mk.getCapsule();
      // capsule.set_correctness_keys(receiving=self.public_keys(DecryptingPower))
      // capsule.set_correctness_keys(verifying=alice_verifying_key)
    });
    const {
      incompleteWorkOrders,
      completeWorkOrders,
    } = await this.workOrdersForCapsules(
      capsulesToActivate,
      treasureMap,
      aliceVerifyingKey
    );

    if (completeWorkOrders) {
      // TODO: Should we support Bob in "KMS" mode?
      // TODO: Attach cfrags from tasks to capsules here?
    }

    const remainingWorkOrders = this.filterWorkOrdersAndCapsules(
      incompleteWorkOrders,
      capsulesToActivate,
      treasureMap.m
    );

    if (!(capsulesToActivate && remainingWorkOrders)) {
      // TODO: Does Porter ensure "freshness" of Ursulas?
      throw new Error('Unable to reach m Ursulas');
    }

    const cleartexts: Buffer[] = [];
    remainingWorkOrders.forEach(workOrder => {
      const result = Bob.reencrypt(workOrder); // TODO: Throw here if fails?
      workOrder.tasks.forEach(task => {
        const capsule = task.getCapsule();
        // TODO: Where to get CFrag from?
        // capsule.withCFrag()

        // TODO: How to check number of CFrags ("length" of capsule)?
        // if (capsule.length > m) {
        //   capsulesToActivate.delete(capsule)
        // }
      });

      messageKits.forEach(messageKit => {
        const sender = messageKit.senderVerifyingKey;
        // TODO: Should PolicyMessageKit.sender be optional?
        if (!sender) {
          throw new Error('Missing PolicyMessageKit sender');
        }
        const deliveredCleartext = this.verifyFrom(sender, messageKit, true);
        // TODO: Is there better way to handle this? Split verifyFrom so that it doesn't output optional value
        cleartexts.push(deliveredCleartext!);
      });
    });

    // TODO: Should we remove CFrags from message kits after we're done? Is it possible with umbral-pre-wasm?
    // if not retain_cfrags:
    // for message in message_kits:
    //     message.capsule.clear_cfrags()
    // for work_order in new_work_orders.values():
    //     work_order.sanitize()
    return cleartexts;
  }

  public async joinPolicy(label: string, aliceVerifyingKey: UmbralPublicKey) {
    const treasureMap = await this.getTreasureMap(aliceVerifyingKey, label);
    // TODO: Is following treasure map required at this point? Do we have to keep
    //       track of know Ursulas internally, since we rely on Porter on Ursula
    //       discovery?
    // this.followTreasureMap(treasureMap);
  }

  public verifyFrom(
    strangerPublicKey: UmbralPublicKey,
    messageKit: PolicyMessageKit | ReencryptedMessageKit,
    decrypt: boolean = false,
    providedSignature?: Buffer
  ): Buffer {
    // const strangerVkBytes = Buffer.from(strangerPublicKey.toBytes());
    // const verifyingKey = Buffer.from(
    //   (
    //     messageKit.senderVerifyingKey ?? messageKit.sender?.verifyingKey!
    //   ).toBytes()
    // );
    // TODO: This check fails
    //       The stranger is Enrico who used their private signing key to create signature
    //       His public key is from a different pair than the keys used to encrypt ciphertext
    //       in message kit (see enrico.test.ts for details).
    // if (strangerVkBytes.compare(verifyingKey)) {
    //   throw new Error("Stranger public key doesn't match message kit sender.");
    // }

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
          cleartext = cleartextWithSignatureHeader.slice(
            SIGNATURE_HEADER_LENGTH
          );
          signatureFromKit = cleartext.slice(0, SIGNATURE_LENGTH);
          message = cleartext.slice(SIGNATURE_LENGTH);
          break;
        // TODO: This never runs
        // case SIGNATURE_HEADER.NOT_SIGNED:
        // break;
        default:
          throw Error(`Unrecognized signature header: ${signatureHeader}`);
      }
    } else {
      // TODO: This never runs
      if (messageKit instanceof PolicyMessageKit) {
        message = messageKit.toBytes();
      } else {
        // TODO: Remove this workaround after implementing ReencryptedMessageKit::toBytes
        // TODO: Should we even distinguish between XMessageKits here?
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

    // Not checking "node on the other end" of message, since it's only for federated mode

    return message;
  }

  private followTreasureMap(treasureMap: PublishedTreasureMap): Buffer {
    throw new Error('Method not implemented.');
  }

  private filterWorkOrdersAndCapsules(
    workOrders: Record<ChecksumAddress, WorkOrder>,
    capsulesToActivate: Set<UmbralCapsule>,
    m: number
  ): WorkOrder[] {
    const remainingCapsules = new Set(capsulesToActivate);
    const remainingWorkOrders = Object.entries(workOrders)
      .map(([_address, workOrder]) => {
        workOrder.tasks.forEach(task => {
          const numberOfCFrags = 0; // TODO: How to get this value from umbral-pre-wasm?
          if (numberOfCFrags >= m) {
            remainingCapsules.delete(task.getCapsule());
          }
        });

        if (!remainingCapsules) {
          return null;
        }
        return workOrder;
      })
      .filter(maybeWorkOrder => !!maybeWorkOrder);
    return remainingWorkOrders as WorkOrder[];
  }

  private async workOrdersForCapsules(
    capsules: Set<UmbralCapsule>,
    treasureMap: PublishedTreasureMap,
    aliceVerifyingKey: UmbralPublicKey
  ) {
    const incompleteWorkOrders: Record<ChecksumAddress, WorkOrder> = {};
    // TODO: Do we also want to handle complete work orders? What would we do with them?
    const completeWorkOrders: Record<ChecksumAddress, WorkOrder> = {};

    const nodes = treasureMap.destinations;
    const nodeIds = Object.keys(nodes);
    const ursulas = await Porter.getUrsulas(
      nodeIds.length,
      undefined,
      undefined,
      nodeIds
    );
    // Dict for easier Ursula lookup
    const ursulaDict: Record<ChecksumAddress, IUrsula> = {};
    ursulas.forEach(ursula => {
      ursulaDict[ursula.checksumAddress] = ursula;
    });

    Object.entries(nodes).forEach(([nodeId, arrangementId]) => {
      const capsulesToInclude: UmbralCapsule[] = [];
      capsules.forEach(capsule => {
        // TODO: Do we want to keep track of work order history here?
        // precedent_work_order = self._completed_work_orders.most_recent_replete(capsule)[node_id]
        // self.log.debug(f"{capsule} already has a saved WorkOrder for this Node:{node_id}.")
        // complete_work_orders[capsule].append(precedent_work_order)
        capsulesToInclude.push(capsule);
      });

      if (capsulesToInclude) {
        incompleteWorkOrders[nodeId] = WorkOrder.constructByBob(
          arrangementId,
          aliceVerifyingKey,
          capsulesToInclude,
          ursulaDict[nodeId],
          this
        );
      }
    });

    if (!incompleteWorkOrders) {
      throw new Error('Failed to create any new work orders');
    }

    return { incompleteWorkOrders, completeWorkOrders };
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
