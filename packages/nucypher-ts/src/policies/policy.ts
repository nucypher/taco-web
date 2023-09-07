import {
  Address,
  EncryptedTreasureMap,
  HRAC,
  PublicKey,
  TreasureMap,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { Alice } from '../characters/alice';
import { RemoteBob } from '../characters/bob';
import { PreSubscriptionManagerAgent } from '../contracts/agents/subscription-manager';
import { Ursula } from '../porter';
import { toBytes, toEpoch, zip } from '../utils';
import { toCanonicalAddress } from '../web3';

export type EnactedPolicy = {
  readonly id: HRAC;
  readonly label: string;
  readonly policyKey: PublicKey;
  readonly encryptedTreasureMap: EncryptedTreasureMap;
  readonly aliceVerifyingKey: PublicKey;
  readonly size: number;
  readonly startTimestamp: Date;
  readonly endTimestamp: Date;
  readonly txHash: string;
};

type IPreEnactedPolicy = Omit<EnactedPolicy, 'txHash'>;

export class PreEnactedPolicy implements IPreEnactedPolicy {
  constructor(
    public readonly id: HRAC,
    public readonly label: string,
    public readonly policyKey: PublicKey,
    public readonly encryptedTreasureMap: EncryptedTreasureMap,
    public readonly aliceVerifyingKey: PublicKey,
    public readonly size: number,
    public readonly startTimestamp: Date,
    public readonly endTimestamp: Date,
  ) {}

  public async enact(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
  ): Promise<EnactedPolicy> {
    const txHash = await this.publish(provider, signer);
    return {
      ...this,
      txHash,
    };
  }

  private async publish(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
  ): Promise<string> {
    const startTimestamp = toEpoch(this.startTimestamp);
    const endTimestamp = toEpoch(this.endTimestamp);
    const ownerAddress = await signer.getAddress();
    const value = await PreSubscriptionManagerAgent.getPolicyCost(
      provider,
      this.size,
      startTimestamp,
      endTimestamp,
    );
    const tx = await PreSubscriptionManagerAgent.createPolicy(
      provider,
      signer,
      value,
      this.id.toBytes(),
      this.size,
      startTimestamp,
      endTimestamp,
      ownerAddress,
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
    private readonly endDate: Date,
  ) {
    this.hrac = new HRAC(
      this.publisher.verifyingKey,
      this.bob.verifyingKey,
      toBytes(this.label),
    );
  }

  public async enact(
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    ursulas: readonly Ursula[],
  ): Promise<EnactedPolicy> {
    const preEnacted = await this.generatePreEnactedPolicy(ursulas);
    return await preEnacted.enact(provider, signer);
  }

  public async generatePreEnactedPolicy(
    ursulas: readonly Ursula[],
  ): Promise<PreEnactedPolicy> {
    if (ursulas.length != this.verifiedKFrags.length) {
      throw new Error(
        `Number of ursulas must match number of verified kFrags: ${this.verifiedKFrags.length}`,
      );
    }
    const treasureMap = this.makeTreasureMap(ursulas, this.verifiedKFrags);
    const encryptedTreasureMap = this.encryptTreasureMap(treasureMap);
    // const revocationKit = new RevocationKit(treasureMap, this.publisher.signer);

    return new PreEnactedPolicy(
      this.hrac,
      this.label,
      this.delegatingKey,
      encryptedTreasureMap,
      this.publisher.verifyingKey,
      this.shares,
      this.startDate,
      this.endDate,
    );
  }

  private makeTreasureMap(
    ursulas: readonly Ursula[],
    verifiedKFrags: readonly VerifiedKeyFrag[],
  ): TreasureMap {
    const assignedKFrags: [Address, [PublicKey, VerifiedKeyFrag]][] = [];
    zip(ursulas, verifiedKFrags).forEach(([ursula, kFrag]) => {
      const ursulaAddress = new Address(
        toCanonicalAddress(ursula.checksumAddress),
      );
      assignedKFrags.push([ursulaAddress, [ursula.encryptingKey, kFrag]]);
    });
    return new TreasureMap(
      this.publisher.signer,
      this.hrac,
      this.delegatingKey,
      assignedKFrags,
      this.threshold,
    );
  }

  private encryptTreasureMap(treasureMap: TreasureMap): EncryptedTreasureMap {
    return treasureMap.encrypt(this.publisher.signer, this.bob.decryptingKey);
  }
}
