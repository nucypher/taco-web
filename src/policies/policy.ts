import {
  EncryptedTreasureMap,
  HRAC,
  PublicKey,
  TreasureMap,
  TreasureMapBuilder,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';

import { SubscriptionManagerAgent } from '../agents/subscription-manager';
import { Alice } from '../characters/alice';
import { RemoteBob } from '../characters/bob';
import { Ursula } from '../characters/porter';
import { toCanonicalAddress } from '../crypto/utils';
import { RevocationKit } from '../kits/revocation';
import { toEpoch } from '../utils';
import { toBytes, zip } from '../utils';

export interface EnactedPolicy {
  id: HRAC;
  label: string;
  policyKey: PublicKey;
  encryptedTreasureMap: EncryptedTreasureMap;
  revocationKit: RevocationKit;
  aliceVerifyingKey: Uint8Array;
  size: number;
  startTimestamp: Date;
  endTimestamp: Date;
  txHash: string;
}

type IPreEnactedPolicy = Omit<EnactedPolicy, 'txHash'>;

export class PreEnactedPolicy implements IPreEnactedPolicy {
  constructor(
    public readonly id: HRAC,
    public readonly label: string,
    public readonly policyKey: PublicKey,
    public readonly encryptedTreasureMap: EncryptedTreasureMap,
    public readonly revocationKit: RevocationKit,
    public readonly aliceVerifyingKey: Uint8Array,
    public readonly size: number,
    public readonly startTimestamp: Date,
    public readonly endTimestamp: Date
  ) {}

  public async enact(publisher: Alice): Promise<EnactedPolicy> {
    const txHash = await this.publish(publisher);
    return {
      ...this,
      txHash,
    };
  }

  private async publish(publisher: Alice): Promise<string> {
    const startTimestamp = toEpoch(this.startTimestamp);
    const endTimestamp = toEpoch(this.endTimestamp);
    const ownerAddress = await publisher.transactingPower.getAddress();
    const value = await SubscriptionManagerAgent.getPolicyCost(
      publisher.transactingPower.provider,
      this.size,
      startTimestamp,
      endTimestamp
    );
    const tx = await SubscriptionManagerAgent.createPolicy(
      publisher.transactingPower,
      value,
      this.id.toBytes(),
      this.size,
      startTimestamp,
      endTimestamp,
      ownerAddress
    );
    return tx.hash;
  }
}

export interface BlockchainPolicyParameters {
  bob: RemoteBob;
  label: string;
  threshold: number;
  shares: number;
  startDate: Date;
  endDate: Date;
}

export class BlockchainPolicy {
  public readonly hrac: HRAC;

  constructor(
    private readonly publisher: Alice,
    private readonly label: string,
    private bob: RemoteBob,
    private verifiedKFrags: VerifiedKeyFrag[],
    private delegatingKey: PublicKey,
    private readonly threshold: number,
    private readonly shares: number,
    private readonly startDate: Date,
    private readonly endDate: Date
  ) {
    this.hrac = new HRAC(
      this.publisher.verifyingKey,
      this.bob.verifyingKey,
      toBytes(this.label)
    );
  }

  public async enact(ursulas: Ursula[]): Promise<EnactedPolicy> {
    const preEnacted = await this.generatePreEnactedPolicy(ursulas);
    return await preEnacted.enact(this.publisher);
  }

  public async generatePreEnactedPolicy(
    ursulas: Ursula[]
  ): Promise<PreEnactedPolicy> {
    const treasureMap = this.makeTreasureMap(ursulas, this.verifiedKFrags);
    const encryptedTreasureMap = this.encryptTreasureMap(treasureMap);
    const revocationKit = new RevocationKit(treasureMap, this.publisher.signer);

    return new PreEnactedPolicy(
      this.hrac,
      this.label,
      this.delegatingKey,
      encryptedTreasureMap,
      revocationKit,
      this.publisher.verifyingKey.toBytes(),
      this.shares,
      this.startDate,
      this.endDate
    );
  }

  private makeTreasureMap(
    ursulas: Ursula[],
    verifiedKFrags: VerifiedKeyFrag[]
  ): TreasureMap {
    const builder = new TreasureMapBuilder(
      this.publisher.signer,
      this.hrac,
      this.delegatingKey,
      this.threshold
    );
    zip(ursulas, verifiedKFrags).forEach(([ursula, kFrag]) => {
      const ursulaAddress = toCanonicalAddress(ursula.checksumAddress);
      builder.addKfrag(ursulaAddress, ursula.encryptingKey, kFrag);
    });
    return builder.build();
  }

  private encryptTreasureMap(treasureMap: TreasureMap): EncryptedTreasureMap {
    return treasureMap.encrypt(this.publisher.signer, this.bob.decryptingKey);
  }
}
