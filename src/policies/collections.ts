import {
  Capsule,
  KeyFrag,
  PublicKey,
  Signature,
  Signer,
  VerifiedCapsuleFrag,
  VerifiedKeyFrag,
} from 'umbral-pre';

import { Alice } from '../characters/alice';
import { Bob } from '../characters/bob';
import { IUrsula } from '../characters/porter';
import { encryptAndSign, keccakDigest } from '../crypto/api';
import {
  EIP712_MESSAGE_SIGNATURE_SIZE,
  ETH_ADDRESS_BYTE_LENGTH,
  ETH_HASH_BYTE_LENGTH,
} from '../crypto/constants';
import {
  canonicalAddressFromPublicKey,
  toCanonicalAddress,
  toChecksumAddress,
} from '../crypto/utils';
import { MessageKit, PolicyMessageKit } from '../kits/message';
import { ChecksumAddress } from '../types';
import {
  encodeVariableLengthMessage,
  fromBase64,
  fromHexString,
  toBase64,
  toBytes,
  zip,
} from '../utils';

import { HRAC } from './hrac';

export type KFragDestinations = Record<ChecksumAddress, Uint8Array>;

export class PublishedTreasureMap {
  constructor(
    public readonly messageKit: MessageKit,
    public destinations: KFragDestinations,
    public m: number
  ) {}
}

export class TreasureMap {
  constructor(
    public readonly m: number,
    public readonly destinations: KFragDestinations,
    public readonly hrac: HRAC
  ) {}

  public static async constructByPublisher(
    hrac: HRAC,
    publisher: Alice,
    bob: Bob,
    label: string,
    ursulas: IUrsula[],
    verifiedKFrags: VerifiedKeyFrag[],
    m: number
  ): Promise<TreasureMap> {
    if (m < 1 || m > 255) {
      throw Error('The threshold must be between 1 and 255.');
    }

    const nUrsulas = Object.keys(ursulas).length;
    if (nUrsulas < m) {
      throw Error(
        `The number of destinations (${nUrsulas}) must be equal or greater than the threshold (${m})`
      );
    }

    const destinations = TreasureMap.makeDestinations(
      ursulas,
      verifiedKFrags,
      hrac,
      publisher
    );
    return new TreasureMap(m, destinations, hrac);
  }

  public static fromBytes(bytes: Uint8Array): TreasureMap {
    const m = bytes[0];
    const hrac = new HRAC(bytes.slice(1, HRAC.BYTE_LENGTH + 1));
    const destinations = this.bytesToNodes(bytes.slice(1 + HRAC.BYTE_LENGTH));
    return new TreasureMap(m, destinations, hrac);
  }

  private static makeDestinations(
    ursulas: IUrsula[],
    verifiedKFrags: VerifiedKeyFrag[],
    hrac: HRAC,
    publisher: Alice
  ): Record<ChecksumAddress, Uint8Array> {
    const destinations: KFragDestinations = {};
    zip(ursulas, verifiedKFrags).forEach(([ursula, verifiedKFrag]) => {
      const kFragPayload = AuthorizedKeyFrag.constructByPublisher(
        hrac,
        verifiedKFrag,
        publisher.signer
      ).toBytes();
      const ursulaEncryptingKey = PublicKey.fromBytes(
        fromHexString(ursula.encryptingKey)
      );
      const encryptedKFrag = encryptAndSign(
        ursulaEncryptingKey,
        kFragPayload,
        publisher.signer
      );
      destinations[ursula.checksumAddress] = encryptedKFrag.ciphertext;
    });
    return destinations;
  }

  private static bytesToNodes(bytes: Uint8Array): KFragDestinations {
    const destinations: KFragDestinations = {};
    for (let i = 0; i < bytes.length; ) {
      const addressBytes = bytes.slice(i, i + ETH_ADDRESS_BYTE_LENGTH);
      const address = toChecksumAddress(addressBytes);
      i += ETH_ADDRESS_BYTE_LENGTH;

      const arrangementIdBytes = bytes.slice(
        i,
        i + AuthorizedKeyFrag.ENCRYPTED_SIZE
      );
      i += AuthorizedKeyFrag.ENCRYPTED_SIZE;

      destinations[address] = arrangementIdBytes;
    }
    return destinations;
  }

  public async encrypt(
    publisher: Alice,
    bob: Bob,
    blockchainSigner?: Signer
  ): Promise<EncryptedTreasureMap> {
    return EncryptedTreasureMap.constructByPublisher(
      this,
      publisher,
      bob,
      blockchainSigner
    );
  }

  public toBytes(): Uint8Array {
    return new Uint8Array([
      ...Uint8Array.from([this.m]).reverse(), // TODO: Ensure m is big-endian
      ...this.hrac.toBytes(),
      ...this.nodesToBytes(this.destinations),
    ]);
  }

  private nodesToBytes(ursulas: KFragDestinations): Uint8Array {
    return Object.entries(ursulas)
      .map(
        ([ursulaAddress, arrangementId]) =>
          new Uint8Array([
            ...toCanonicalAddress(ursulaAddress),
            ...arrangementId,
          ])
      )
      .reduce((next, accumulator) => new Uint8Array([...accumulator, ...next]));
  }
}

export class AuthorizedKeyFrag {
  public static readonly ENCRYPTED_SIZE = 477; // 619; // Hardcoded - depends on Umbral implementation
  private static readonly WRIT_CHECKSUM_SIZE = 32;
  private readonly writ: Uint8Array;

  constructor(
    private readonly hrac: HRAC,
    private readonly kFragChecksum: Uint8Array,
    private readonly writSignature: Signature,
    private readonly kFrag: KeyFrag
  ) {
    this.writ = new Uint8Array([...hrac.toBytes(), ...kFragChecksum]);
  }

  public static constructByPublisher(
    hrac: HRAC,
    verifiedKFrag: VerifiedKeyFrag,
    publisherSigner: Signer
  ): AuthorizedKeyFrag {
    const kFrag = KeyFrag.fromBytes(verifiedKFrag.toBytes());

    const kFragChecksum = AuthorizedKeyFrag.kFragChecksum(kFrag);
    const writ = new Uint8Array([...hrac.toBytes(), ...kFragChecksum]);
    const writSignature = publisherSigner.sign(writ);

    return new AuthorizedKeyFrag(hrac, kFragChecksum, writSignature, kFrag);
  }

  private static kFragChecksum(kFrag: KeyFrag): Uint8Array {
    return keccakDigest(kFrag.toBytes()).slice(
      0,
      AuthorizedKeyFrag.WRIT_CHECKSUM_SIZE
    );
  }

  public toBytes(): Uint8Array {
    return new Uint8Array([
      ...this.writ,
      ...this.writSignature.toBytes(),
      ...this.kFrag.toBytes(),
    ]);
  }
}

export class EncryptedTreasureMap {
  private readonly EMPTY_BLOCKCHAIN_SIGNATURE = new Uint8Array(
    EIP712_MESSAGE_SIGNATURE_SIZE
  );

  constructor(
    public readonly hrac: HRAC,
    public readonly publicSignature: Signature,
    public readonly encryptedTreasureMap: PolicyMessageKit,
    public readonly blockchainSignature?: Signature | null
  ) {}

  public static async constructByPublisher(
    treasureMap: TreasureMap,
    publisher: Alice,
    bob: Bob,
    blockchainSigner?: Signer
  ): Promise<EncryptedTreasureMap> {
    const messageKit = encryptAndSign(
      bob.encryptingPublicKey,
      treasureMap.toBytes(),
      publisher.signer
    );
    const encryptedTreasureMap = PolicyMessageKit.fromMessageKit(
      messageKit,
      publisher.signer.verifyingKey()
    );

    const toSign = new Uint8Array([
      ...publisher.verifyingKey.toBytes(),
      ...treasureMap.hrac.toBytes(),
    ]);
    const publicSignature = publisher.signer.sign(toSign);

    const blockchainSignature = blockchainSigner
      ? EncryptedTreasureMap.sign(
          blockchainSigner,
          publicSignature,
          treasureMap.hrac,
          encryptedTreasureMap
        )
      : null;

    return new EncryptedTreasureMap(
      treasureMap.hrac,
      publicSignature,
      encryptedTreasureMap,
      blockchainSignature
    );
  }

  public static sign(
    blockchainSigner: Signer,
    publicSignature: Signature,
    hrac: HRAC,
    encryptedTreasureMap: PolicyMessageKit
  ): Signature {
    const payload = new Uint8Array([
      ...publicSignature.toBytes(),
      ...hrac.toBytes(),
      ...encryptedTreasureMap.ciphertext,
    ]);
    return blockchainSigner.sign(payload);
  }

  public toBytes(): Uint8Array {
    const signature = this.blockchainSignature
      ? this.blockchainSignature.toBytes()
      : this.EMPTY_BLOCKCHAIN_SIGNATURE;
    return new Uint8Array([
      ...this.publicSignature.toBytes(),
      ...this.hrac.toBytes(),
      ...encodeVariableLengthMessage(this.encryptedTreasureMap.toBytes()),
      ...signature,
    ]);
  }

  public decrypt(bob: Bob, publisherVerifyingKey: PublicKey): TreasureMap {
    const bytes = bob.verifyFrom(
      publisherVerifyingKey,
      this.encryptedTreasureMap,
      true
    );
    return TreasureMap.fromBytes(bytes);
  }
}

export class Revocation {
  private PREFIX: Uint8Array = toBytes('REVOKE-');
  private signature: Uint8Array;

  constructor(private arrangementId: Uint8Array, signer: Signer) {
    this.arrangementId = arrangementId;
    const message = new Uint8Array([...this.PREFIX, ...arrangementId]);
    this.signature = signer.sign(message).toBytes();
  }
}

class PRETask {
  constructor(
    public readonly capsule: Capsule,
    private signature?: Uint8Array
  ) {}

  public setSignature(signature: Uint8Array) {
    this.signature = signature;
  }

  public getSpecification(
    ursulaPublicKey: Uint8Array,
    aliceAddress: Uint8Array,
    blockHash: Uint8Array,
    ursulaIdentityEvidence: Uint8Array
  ): Uint8Array {
    const expectedLengths = [
      // TODO: What is the expected length of pub key? 32 or 33 bytes?
      // [ursulaPublicKey, 'ursulaPublicKey', 32 or 33?]
      {
        value: aliceAddress,
        name: 'aliceAddress',
        expectedLength: ETH_ADDRESS_BYTE_LENGTH,
      },
      {
        value: blockHash,
        name: 'blockHash',
        expectedLength: ETH_HASH_BYTE_LENGTH,
      },
    ];

    expectedLengths.forEach(({ value, name, expectedLength }) => {
      if (value.length !== expectedLength) {
        throw new Error(
          `${name} must be of length ${expectedLength}, but it's ${value.length}`
        );
      }
    });

    return new Uint8Array([
      ...this.capsule.toBytes(),
      ...ursulaPublicKey,
      ...ursulaIdentityEvidence,
      ...aliceAddress,
      ...blockHash,
    ]);
  }
}

export class WorkOrder {
  private static HEADER = toBytes('wo:');
  private completed: boolean;

  public constructor(
    private bob: Bob,
    private arrangementId: Uint8Array,
    private aliceAddress: Uint8Array,
    public readonly tasks: PRETask[],
    private receiptSignature: Uint8Array,
    public readonly ursula: IUrsula,
    private blockHash: Uint8Array
  ) {
    this.completed = false;
  }

  public static constructByBob(
    arrangementId: Uint8Array,
    aliceVerifyingKey: PublicKey,
    capsules: Capsule[],
    ursula: IUrsula,
    bob: Bob
  ): WorkOrder {
    const aliceAddress = canonicalAddressFromPublicKey(aliceVerifyingKey);

    // TODO: It was marked as `TODO` in `nucypher/nucypher. Should it be implemneted?
    // TODO: Bob's input to prove freshness for this work order
    const blockHash = keccakDigest(fromHexString('0x0'));

    // TODO: Implement evidence?
    // ursula_identity_evidence = b''
    // if ursula._stamp_has_valid_signature_by_worker():
    //     ursula_identity_evidence = ursula.decentralized_identity_evidence
    // signature = transacting_power.sign_message(message=bytes(self.stamp))
    // self.__decentralized_identity_evidence = signature
    const ursulaIdentityEvidence = fromHexString('0x0');
    const ursulaPublicKey = fromHexString(ursula.encryptingKey);

    const tasks = capsules.map((capsule) => {
      const task = new PRETask(capsule);
      const specification = task.getSpecification(
        ursulaPublicKey,
        aliceAddress,
        blockHash,
        ursulaIdentityEvidence
      );
      const taskSignature = bob.signer.sign(specification).toBytes();
      task.setSignature(taskSignature);
      return task;
    });
    const receiptSignature = this.makeReceiptSignature(
      capsules,
      ursulaPublicKey,
      bob
    );

    return new WorkOrder(
      bob,
      arrangementId,
      aliceAddress,
      tasks,
      receiptSignature,
      ursula,
      blockHash
    );
  }

  private static makeReceiptSignature(
    capsules: Capsule[],
    ursulaPublicKey: Uint8Array,
    bob: Bob
  ) {
    // TODO: It was marked as `TODO` in `nucypher/nucypher. Should it be implemented?
    // TODO: What's the purpose of the receipt? Should it include only the capsules?
    const capsulesBytes = new Uint8Array(
      capsules
        .map((c) => c.toBytes())
        .reduce(
          (next, accumulator) =>
            // TODO: This seems wasteful
            new Uint8Array([...accumulator, ...next])
        )
    );
    const receiptBytes = new Uint8Array([
      ...this.HEADER,
      ...ursulaPublicKey,
      ...capsulesBytes,
    ]);
    return bob.signer.sign(receiptBytes).toBytes();
  }

  public payload(): Uint8Array {
    throw new Error('Not implemented.');
  }
}

export class WorkOrderResult {
  constructor(
    public readonly cFrag: VerifiedCapsuleFrag,
    private reencryptionSignature: Signature
  ) {}

  public static fromBytes(bytes: Uint8Array): WorkOrderResult {
    // TODO: What is the serialization format used here?
    throw new Error('Not implemented.');
  }
}
