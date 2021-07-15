import { KeyFrag, PublicKey, VerifiedCapsuleFrag } from 'umbral-pre';
import secureRandom from 'secure-random';

import { Alice } from '../characters/alice';
import { Bob } from '../characters/bob';
import { IUrsula } from '../characters/porter';
import { Ursula } from '../characters/ursula';
import { keccakDigest } from '../crypto/api';
import { RevocationKit } from '../crypto/kits';
import { ChecksumAddress } from '../types';
import { PrePublishedTreasureMap, TreasureMap } from './collections';

export interface EnactedPolicy {
  id: Buffer;
  hrac: Buffer;
  label: string;
  publicKey: Buffer;
  treasureMap: PrePublishedTreasureMap;
  revocationKit: RevocationKit;
  aliceVerifyingKey: Buffer;
}

export interface ArrangementForUrsula {
  ursula: IUrsula;
  arrangement: Arrangement;
}

export class BlockchainPolicy {
  private ID_LENGTH: number = 16;
  private readonly alice: Alice;
  private readonly label: string;
  private readonly expiration: Date;
  private bob: Bob;
  private kFrags: KeyFrag[];
  private publicKey: PublicKey;
  private readonly m: number;
  private readonly id: Buffer;

  constructor(
    alice: Alice,
    label: string,
    expiration: Date,
    bob: Bob,
    kFrags: KeyFrag[],
    publicKey: PublicKey,
    m: number
  ) {
    this.alice = alice;
    this.label = label;
    this.expiration = expiration;
    this.bob = bob;
    this.kFrags = kFrags;
    this.publicKey = publicKey;
    this.m = m;
    this.id = this.constructPolicyId();
  }

  public enactArrangement(
    arrangement: Arrangement,
    kFrag: VerifiedCapsuleFrag,
    ursula: IUrsula,
    publicationTransaction: any
  ): ChecksumAddress | null {
    const enactmentPayload = Buffer.concat([
      Buffer.from(publicationTransaction),
      Buffer.from(kFrag.toBytes()),
    ]);
    const ursulaPublicKey = PublicKey.fromBytes(
      Buffer.from(ursula.encryptingKey, 'hex')
    );
    const messageKit = this.alice.encryptFor(ursulaPublicKey, enactmentPayload);
    return Ursula.enactPolicy(ursula, arrangement.getId(), messageKit);
  }

  public publishToBlockchain(arrangements: ArrangementForUrsula[]): string {
    const addresses = arrangements.map(a => a.ursula.checksumAddress);
    // TODO: Implement after adding web3 client
    // receipt = self.alice.policy_agent.create_policy(
    //     policy_id=self.hrac,  # bytes16 _policyID
    //     transacting_power=self.alice.transacting_power,
    //     value=self.value,
    //     end_timestamp=self.expiration.epoch,  # uint16 _numberOfPeriods
    //     node_addresses=addresses  # address[] memory _nodes
    // )
    // return receipt['transactionHash']
    throw new Error('Method not implemented.');
  }

  public async enact(ursulas: IUrsula[]): Promise<EnactedPolicy> {
    const arrangements = this.makeArrangements(ursulas);
    await this.enactArrangements(arrangements);

    const treasureMap = this.makeTreasureMap(arrangements);

    const revocationKit = new RevocationKit(treasureMap, this.alice.signer);

    return {
      id: this.id,
      label: this.label,
      publicKey: Buffer.from(this.publicKey.toBytes()),
      treasureMap,
      revocationKit,
      aliceVerifyingKey: Buffer.from(this.alice.verifyingKey.toBytes()),
      hrac: treasureMap.hrac,
    };
  }

  private constructPolicyId(): Buffer {
    const label = Buffer.from(this.label);
    const pk = this.bob.verifyingKey.toBytes();
    return keccakDigest(Buffer.concat([label, pk])).slice(0, this.ID_LENGTH);
  }

  private proposeArrangement(ursula: IUrsula): ArrangementForUrsula | null {
    const arrangement = Arrangement.fromAlice(this.alice, this.expiration);
    const maybeAddress = Ursula.proposeArrangement(ursula, arrangement);
    if (maybeAddress) {
      return { ursula, arrangement };
    }
    return null;
  }

  private makeArrangements(ursulas: IUrsula[]): ArrangementForUrsula[] {
    const arrangements: ArrangementForUrsula[] = [];
    ursulas.forEach(ursula => {
      const arrangement = this.proposeArrangement(ursula);
      if (arrangement) {
        arrangements.push(arrangement);
      }
    });
    return arrangements;
  }

  private async enactArrangements(
    arrangements: ArrangementForUrsula[]
  ): Promise<void> {
    const publicationTx = await this.publishToBlockchain(arrangements);
    const maybeAllEnacted = arrangements
      .map((x, index) => ({
        ursula: x.ursula,
        arrangement: x.arrangement,
        kFrag: this.kFrags[index],
      }))
      .map(({ arrangement, kFrag, ursula }) =>
        this.enactArrangement(arrangement, kFrag, ursula, publicationTx)
      );
    const allEnacted = maybeAllEnacted.every(x => !!x);

    if (!allEnacted) {
      const notEnacted = arrangements.filter(
        x => !maybeAllEnacted.includes(x.ursula.checksumAddress)
      );
      throw Error(`Failed to enact some of arrangements: ${notEnacted}`);
    }
  }

  private makeTreasureMap(
    arrangements: ArrangementForUrsula[]
  ): PrePublishedTreasureMap {
    const treasureMap = new TreasureMap(this.m);
    arrangements.forEach(({ arrangement, ursula }) => {
      treasureMap.addArrangement(ursula, arrangement);
    });
    return treasureMap.prepareForPublication(
      this.bob.encryptingPublicKey,
      this.bob.verifyingKey,
      this.alice.signer,
      this.label
    );
  }
}

export class Arrangement {
  private static ID_LENGTH = 32;
  private aliceVerifyingKey: PublicKey;
  private readonly arrangementId: Buffer;
  private expiration: Date;

  constructor(
    aliceVerifyingKey: PublicKey,
    arrangementId: Buffer,
    expiration: Date
  ) {
    this.aliceVerifyingKey = aliceVerifyingKey;
    this.arrangementId = arrangementId;
    this.expiration = expiration;
  }

  public static fromAlice(alice: Alice, expiration: Date): Arrangement {
    const arrangementId = Buffer.from(secureRandom(this.ID_LENGTH));
    return new Arrangement(alice.verifyingKey, arrangementId, expiration);
  }

  public toBytes(): Buffer {
    return Buffer.concat([
      this.aliceVerifyingKey.toBytes(),
      this.arrangementId,
      Buffer.from(this.expiration.toISOString()),
    ]);
  }

  public getId(): Buffer {
    return this.arrangementId;
  }
}
