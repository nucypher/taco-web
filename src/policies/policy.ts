import {
  Address,
  EncryptedTreasureMap,
  HRAC,
  PublicKey,
  TreasureMap,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';

import { PreSubscriptionManagerAgent } from '../agents/subscription-manager';
import { Alice } from '../characters/alice';
import { RemoteBob } from '../characters/bob';
import { Ursula } from '../characters/porter';
// import { RevocationKit } from '../kits/revocation';
import { toBytes, toEpoch, zip } from '../utils';
import { toCanonicalAddress } from '../web3';

export type EnactedPolicy = {
  readonly id: HRAC;
  readonly label: string;
  readonly policyKey: PublicKey;
  readonly encryptedTreasureMap: EncryptedTreasureMap;
  // readonly revocationKit: RevocationKit;
  readonly aliceVerifyingKey: Uint8Array;
  readonly size: number;
  readonly startTimestamp: Date;
  readonly endTimestamp: Date;
  readonly txHash: string;
};

type IPreEnactedPolicy = Omit<EnactedPolicy, 'txHash'>;

export type EnactedPolicyJSON = Omit<
  EnactedPolicy,
  'policyKey' | 'encryptedTreasureMap' | 'id'
> & {
  policyKey: Uint8Array;
  id: Uint8Array;
  encryptedTreasureMap: Uint8Array;
};

export class PreEnactedPolicy implements IPreEnactedPolicy {
  constructor(
    public readonly id: HRAC,
    public readonly label: string,
    public readonly policyKey: PublicKey,
    public readonly encryptedTreasureMap: EncryptedTreasureMap,
    // public readonly revocationKit: RevocationKit,
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
    const ownerAddress = await publisher.web3Provider.getSigner().getAddress();
    const value = await PreSubscriptionManagerAgent.getPolicyCost(
      publisher.web3Provider,
      this.size,
      startTimestamp,
      endTimestamp
    );
    const tx = await PreSubscriptionManagerAgent.createPolicy(
      publisher.web3Provider,
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

export type BlockchainPolicyParameters = {
  readonly bob: RemoteBob;
  readonly label: string;
  readonly threshold: number;
  readonly shares: number;
  readonly startDate: Date;
  readonly endDate: Date;
};

export class BlockchainPolicy {
  public readonly hrac: HRAC;

  constructor(
    private readonly publisher: Alice,
    private readonly label: string,
    private readonly bob: RemoteBob,
    private readonly verifiedKFrags: readonly VerifiedKeyFrag[],
    private readonly delegatingKey: PublicKey,
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

  public async enact(ursulas: readonly Ursula[]): Promise<EnactedPolicy> {
    const preEnacted = await this.generatePreEnactedPolicy(ursulas);
    return await preEnacted.enact(this.publisher);
  }

  public async generatePreEnactedPolicy(
    ursulas: readonly Ursula[]
  ): Promise<PreEnactedPolicy> {
    const treasureMap = this.makeTreasureMap(ursulas, this.verifiedKFrags);
    const encryptedTreasureMap = this.encryptTreasureMap(treasureMap);
    // const revocationKit = new RevocationKit(treasureMap, this.publisher.signer);

    return new PreEnactedPolicy(
      this.hrac,
      this.label,
      this.delegatingKey,
      encryptedTreasureMap,
      // revocationKit,
      this.publisher.verifyingKey.toCompressedBytes(),
      this.shares,
      this.startDate,
      this.endDate
    );
  }

  private makeTreasureMap(
    ursulas: readonly Ursula[],
    verifiedKFrags: readonly VerifiedKeyFrag[]
  ): TreasureMap {
    const assigned_kfrags: [Address, [PublicKey, VerifiedKeyFrag]][] = [];
    zip(ursulas, verifiedKFrags).forEach(([ursula, kFrag]) => {
      const ursulaAddress = new Address(
        toCanonicalAddress(ursula.checksumAddress)
      );
      assigned_kfrags.push([ursulaAddress, [ursula.encryptingKey, kFrag]]);
    });
    return new TreasureMap(
      this.publisher.signer,
      this.hrac,
      this.delegatingKey,
      assigned_kfrags,
      this.threshold
    );
  }

  private encryptTreasureMap(treasureMap: TreasureMap): EncryptedTreasureMap {
    return treasureMap.encrypt(this.publisher.signer, this.bob.decryptingKey);
  }
}
