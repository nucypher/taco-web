import { PublicKey, VerifiedKeyFrag } from 'umbral-pre';

import { PolicyManagerAgent } from '../agents/policy-manager';
import { Alice } from '../characters/alice';
import { RemoteBob } from '../characters/bob';
import { Ursula } from '../characters/porter';
import { RevocationKit } from '../kits/revocation';
import { ChecksumAddress } from '../types';

import { EncryptedTreasureMap, TreasureMap } from './collections';
import { HRAC } from './hrac';

export interface EnactedPolicy {
  id: HRAC;
  label: string;
  policyKey: PublicKey;
  encryptedTreasureMap: EncryptedTreasureMap;
  revocationKit: RevocationKit;
  aliceVerifyingKey: Uint8Array;
  ursulas: Ursula[];
}

export interface BlockchainPolicyParameters {
  /** `RemoteBob` which represents the receiver of the encrypted messages **/
  bob: RemoteBob;
  /** Policy label **/
  label: string;
  /** Policy threshold. "N" in the "N" of "N". **/
  threshold: number;
  /** Policy shares. "M" in the "N" of "N". **/
  shares: number;
  /** Policy expiration date. If left blank, will be calculated from `paymentPeriods` **/
  expiration?: Date;
  /** Number of payment periods that the policy will be valid for. **/
  paymentPeriods: number; // TODO: Make it optional and calculate from expiration if needed.
  /** Policy value. Used to compensate Ursulas. If left blank, will be calculated from `rate`. **/
  value?: number;
  /** Fee rate to compensate Ursulas. If left blank, the global minimal rate will be fetched from staking contract instead. **/
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
    this.hrac = HRAC.derive(
      this.publisher.verifyingKey.toBytes(),
      this.bob.verifyingKey.toBytes(),
      this.label
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

  public async publish(ursulas: ChecksumAddress[]): Promise<void> {
    const ownerAddress = await this.publisher.transactingPower.getAddress();
    await PolicyManagerAgent.createPolicy(
      this.publisher.transactingPower,
      this.hrac.toBytes(),
      this.value,
      (this.expiration.getTime() / 1000) | 0,
      ursulas,
      ownerAddress
    );
  }

  public async enact(ursulas: Ursula[]): Promise<EnactedPolicy> {
    const ursulaAddresses = ursulas.map((u) => u.checksumAddress);
    await this.publish(ursulaAddresses);

    const treasureMap = await TreasureMap.constructByPublisher(
      this.hrac,
      this.publisher,
      ursulas,
      this.verifiedKFrags,
      this.threshold,
      this.delegatingKey
    );
    const encryptedTreasureMap = await this.encryptTreasureMap(treasureMap);
    const revocationKit = new RevocationKit(treasureMap, this.publisher.signer);

    return {
      id: this.hrac,
      label: this.label,
      policyKey: this.delegatingKey,
      encryptedTreasureMap,
      revocationKit,
      aliceVerifyingKey: this.publisher.verifyingKey.toBytes(),
      ursulas,
    };
  }

  private encryptTreasureMap(treasureMap: TreasureMap): EncryptedTreasureMap {
    return treasureMap.encrypt(this.publisher, this.bob.decryptingKey);
  }
}
