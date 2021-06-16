import randomBuffer from 'secure-random';
import { Alice } from '../characters/alice';
import { Bob } from '../characters/bob';
import { IUrsula } from '../characters/porter';
import { Ursula } from '../characters/ursula';
import { keccakDigest } from '../crypto/api';
import { RevocationKit } from '../crypto/kits';
import { UmbralKFrag, UmbralPublicKey } from '../types';
import { PreparedTreasureMap, TreasureMap } from './collections';

export interface EnactedPolicy {
  id: Buffer;
  hrac: Buffer;
  label: string;
  publicKey: UmbralPublicKey;
  treasureMap: PreparedTreasureMap;
  revocationKit: RevocationKit;
  aliceSignerPublicKey: UmbralPublicKey;
}

interface ArrangementForUrsula {
  ursula: IUrsula;
  arrangement: Arrangement;
}

export class BlockchainPolicy {
  private alice: Alice;
  private label: string;
  private expiration: Date;
  private bob: Bob;
  private kFrags: UmbralKFrag[];
  private publicKey: UmbralPublicKey;
  private m: number;
  private id: Buffer;

  constructor(
    alice: Alice,
    label: string,
    expiration: Date,
    bob: Bob,
    kFrags: UmbralKFrag[],
    publicKey: UmbralPublicKey,
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

  private constructPolicyId(): Buffer {
    const label = Buffer.from(this.label);
    const pk = this.bob.getSignerPublicKey().toBytes();
    return keccakDigest(Buffer.concat([label, pk]));
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
    return ursulas
      .map(this.proposeArrangement)
      .filter(maybeArrangement => !!maybeArrangement) as ArrangementForUrsula[];
  }

  private enactArrangement(
    arrangement: Arrangement,
    kFrag: UmbralKFrag,
    ursula: IUrsula,
    publicationTransaction: any
  ) {
    const enactmentPayload = Buffer.concat([
      Buffer.from(publicationTransaction),
      Buffer.from(kFrag.toBytes()),
    ]);
    const messageKit = this.alice.encryptFor(ursula, enactmentPayload);
    return Ursula.enactPolicy(ursula, arrangement.getId(), messageKit);
  }

  private enactArrangements(arrangements: ArrangementForUrsula[]): void {
    const publicationTx = this.publishToBlockchain(arrangements);
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

  public publishToBlockchain(arrangements: ArrangementForUrsula[]): string {
    const addresses = arrangements.map(a => a.ursula.checksumAddress);
    // TOODO: Implement after adding web3 client
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

  private makeTreasureMap(
    arrangements: ArrangementForUrsula[]
  ): PreparedTreasureMap {
    const treasureMap = new TreasureMap(this.m);
    arrangements.forEach(({ arrangement, ursula }) => {
      treasureMap.addArrangement(ursula, arrangement);
    });
    return treasureMap.prepareForPublication(
      this.bob.getEncryptingPublicKey(),
      this.bob.getSignerPublicKey(),
      this.alice.getSigner(),
      this.label
    );
  }

  public enact(ursulas: IUrsula[]): EnactedPolicy {
    const arrangements = this.makeArrangements(ursulas);
    this.enactArrangements(arrangements);

    const treasureMap = this.makeTreasureMap(arrangements);

    const revocationKit = new RevocationKit(
      treasureMap,
      this.alice.getSigner()
    );

    const enactedPolicy = {
      id: this.id,
      label: this.label,
      publicKey: this.publicKey,
      treasureMap,
      revocationKit,
      aliceSignerPublicKey: this.alice.getSignerPublicKey(),
      hrac: treasureMap.hrac,
    };
    return enactedPolicy;
  }
}

export class Arrangement {
  private static ID_LENGTH = 32;
  private aliceVerifyingKey: UmbralPublicKey;
  private arrangementId: Buffer;
  private expiration: Date;

  constructor(
    aliceVerifyingKey: UmbralPublicKey,
    arrangementId: Buffer,
    expiration: Date
  ) {
    this.aliceVerifyingKey = aliceVerifyingKey;
    this.arrangementId = arrangementId;
    this.expiration = expiration;
  }

  public static fromAlice(alice: Alice, expiration: Date): Arrangement {
    const aliceKey = alice.getSignerPublicKey();
    const arrangementId = randomBuffer(this.ID_LENGTH);
    return new Arrangement(aliceKey, arrangementId, expiration);
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
