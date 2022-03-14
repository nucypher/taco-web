import {
  EncryptedTreasureMap,
  HRAC,
  PublicKey,
  TreasureMap,
  TreasureMapBuilder,
  VerifiedKeyFrag,
} from '@nucypher/nucypher-core';

import { PolicyManagerAgent } from '../agents/policy-manager';
import { Alice } from '../characters/alice';
import { RemoteBob } from '../characters/bob';
import { Ursula } from '../characters/porter';
import { toCanonicalAddress } from '../crypto/utils';
import { RevocationKit } from '../kits/revocation';
import { ChecksumAddress } from '../types';
import { toBytes, zip } from '../utils';

export interface EnactedPolicy {
  id: HRAC;
  label: string;
  policyKey: PublicKey;
  encryptedTreasureMap: EncryptedTreasureMap;
  revocationKit: RevocationKit;
  aliceVerifyingKey: Uint8Array;
  ursulaAddresses: ChecksumAddress[];
  expiration: Date;
  value: number;
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
    public readonly ursulaAddresses: ChecksumAddress[],
    public readonly expiration: Date,
    public readonly value: number
  ) {}

  public async enact(publisher: Alice): Promise<EnactedPolicy> {
    const txHash = await this.publish(publisher);
    return {
      ...this,
      txHash,
    };
  }

  private async publish(publisher: Alice): Promise<string> {
    const expirationTimestamp = (this.expiration.getTime() / 1000) | 0;
    const ownerAddress = await publisher.transactingPower.getAddress();
    const tx = await PolicyManagerAgent.createPolicy(
      publisher.transactingPower,
      this.id.toBytes(),
      this.value,
      expirationTimestamp,
      this.ursulaAddresses,
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
  expiration?: Date;
  paymentPeriods: number;
  value?: number;
  rate?: number;
}

export class BlockchainPolicy {
  public readonly hrac: HRAC;

  constructor(
    private readonly publisher: Alice,
    private readonly label: string,
    private readonly expiration: Date,
    private bob: RemoteBob,
    private verifiedKFrags: VerifiedKeyFrag[],
    private delegatingKey: PublicKey,
    private readonly threshold: number,
    private readonly shares: number,
    private readonly value: number
  ) {
    this.hrac = new HRAC(
      this.publisher.verifyingKey,
      this.bob.verifyingKey,
      toBytes(this.label)
    );
  }

  public static calculateValue(
    shares: number,
    paymentPeriods: number,
    value?: number,
    rate?: number
  ): number {
    // Check for negative inputs
    const inputs = { shares, paymentPeriods, value, rate };
    for (const [inputName, inputValue] of Object.entries(inputs)) {
      if (inputValue && inputValue < 0) {
        throw Error(
          `Negative policy parameters are not allowed: ${inputName} is ${inputValue}`
        );
      }
    }

    // Check for invalid policy parameters
    const hasNoValue = value === undefined || value === 0;
    const hasNoRate = rate === undefined || rate === 0;
    if (hasNoValue && hasNoRate) {
      throw Error(
        `Either 'value' or 'rate'  must be provided for policy. Got value: ${value} and rate: ${rate}`
      );
    }

    if (value === undefined) {
      value = rate! * paymentPeriods * shares;
    }

    const valuePerNode = Math.floor(value / shares);
    if (valuePerNode * shares !== value) {
      throw Error(
        `Policy value of ${value} wei cannot be divided into ${shares} shares without a remainder.`
      );
    }

    const ratePerPeriod = Math.floor(valuePerNode / paymentPeriods);
    const recalculatedValue = ratePerPeriod * paymentPeriods * shares;
    if (recalculatedValue !== value) {
      throw Error(
        `Policy value of ${valuePerNode} wei per node cannot be divided by duration ` +
          `${paymentPeriods} periods without a remainder.`
      );
    }

    return value!;
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
    const ursulaAddresses = ursulas.map((u) => u.checksumAddress);

    return new PreEnactedPolicy(
      this.hrac,
      this.label,
      this.delegatingKey,
      encryptedTreasureMap,
      revocationKit,
      this.publisher.verifyingKey.toBytes(),
      ursulaAddresses,
      this.expiration,
      this.value
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
