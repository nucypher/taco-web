import { Alice } from './characters/alice';
import { Bob } from './characters/bob';
import { Ursula } from './characters/porter';
import { KeyFrags, TreasureMap, UmbralKFrags, UmbralPublicKey } from './types';

export class RevocationKit {}

interface EnactedPolicy {
  id: Buffer;
  //   hrac: Buffer; // TODO: Should it be removed?
  label: Buffer;
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
  // TODO: Add this property?
  //   private id: Buffer;

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
    // this.id = this.constructPolicyId();
  }

  private constructPolicyId(): Buffer {
    // keccak_digest(label + stamp)
    throw new Error('Method not implemented.');
  }

  public enact(
    ursulas: Ursula[]
  ): { enactedPolicy: EnactedPolicy; enactPolicyTx: unknown } {
    throw new Error('Method not implemented.');
  }
}
