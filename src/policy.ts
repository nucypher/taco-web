import keccak256 from 'keccak256';

import { Alice } from './characters/alice';
import { Bob } from './characters/bob';
import { Ursula } from './characters/porter';
import {
  TreasureMap,
  UmbralKFrags,
  UmbralPublicKey,
  UmbralSigner,
} from './types';


export class RevocationKit {
  constructor(treasureMap: TreasureMap, signer: UmbralSigner) {
    throw new Error('Method not implemented.');
  }
}

interface EnactedPolicy {
  id: Buffer;
  //   hrac: Buffer; // TODO: Should it be removed?
  label: string;
  publicKey: UmbralPublicKey;
  treasureMap: TreasureMap;
  revocationKit: RevocationKit;
  aliceVeryfingKey: UmbralPublicKey;
}

export class BlockchainPolicy {
  private alice: Alice;
  private label: string;
  private expiration: Date;
  private bob: Bob;
  private kFrags: UmbralKFrags[];
  private publicKey: UmbralPublicKey;
  private m: number;
  private id: Buffer;

  constructor(
    alice: Alice,
    label: string,
    expiration: Date,
    bob: Bob,
    kFrags: UmbralKFrags[],
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
    return keccak256(Buffer.concat([label, pk]));
  }

  private makeArrangements(): void {
    throw new Error('Method not implemented.');
  }

  private enactArrangements(arrangements: any): void {
    throw new Error('Method not implemented.');
  }

  private makeTreasureMap(arrangements: any): TreasureMap {
    throw new Error('Method not implemented.');
  }
  public enact(ursulas: Ursula[]): EnactedPolicy {
    // TODO: Not sure how enacting policies should work
    //       Do we still have to make arrangements or will it be taken care of by TMapConKfrags?
    const arrangements = this.makeArrangements();
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
      aliceVeryfingKey: this.alice.getSignerPublicKey(),
    };
    return enactedPolicy;
  }
}
