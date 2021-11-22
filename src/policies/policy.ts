import secureRandom from 'secure-random';
import { PublicKey, VerifiedKeyFrag } from 'umbral-pre';

import { PolicyManagerAgent } from '../agents/policy-manager';
import { Alice } from '../characters/alice';
import { RemoteBob } from '../characters/bob';
import { Ursula } from '../characters/porter';
import { RevocationKit } from '../kits/revocation';

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

interface ArrangementForUrsula {
  ursula: Ursula;
  arrangement: Arrangement;
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

  public async publishToBlockchain(
    arrangements: ArrangementForUrsula[]
  ): Promise<string> {
    const addresses = arrangements.map((a) => a.ursula.checksumAddress);
    const ownerAddress = await this.publisher.transactingPower.getAddress();
    const txReceipt = await PolicyManagerAgent.createPolicy(
      this.publisher.transactingPower,
      this.hrac.toBytes(),
      this.value,
      (this.expiration.getTime() / 1000) | 0,
      addresses,
      ownerAddress
    );
    // `blockHash` is not undefined because we wait for tx to be mined
    return txReceipt.blockHash!;
  }

  public async enact(ursulas: Ursula[]): Promise<EnactedPolicy> {
    const arrangements = await this.makeArrangements(ursulas);
    await this.enactArrangements(arrangements);

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

  private async makeArrangements(
    ursulas: Ursula[]
  ): Promise<ArrangementForUrsula[]> {
    return ursulas.map((ursula) => {
      const arrangement = Arrangement.fromPublisher(
        this.publisher,
        this.expiration
      );
      return { arrangement, ursula };
    });
  }

  private async enactArrangements(
    arrangements: ArrangementForUrsula[]
  ): Promise<string> {
    return this.publishToBlockchain(arrangements);
  }
}

// TODO: Investigate Arrangement being only used to pass around arrangementId
export class Arrangement {
  private static readonly ID_LENGTH = 32;
  private readonly aliceVerifyingKey: PublicKey;
  private readonly expiration: Date;
  public readonly arrangementId: Uint8Array;

  constructor(
    aliceVerifyingKey: PublicKey,
    arrangementId: Uint8Array,
    expiration: Date
  ) {
    this.aliceVerifyingKey = aliceVerifyingKey;
    this.arrangementId = arrangementId;
    this.expiration = expiration;
  }

  public static fromPublisher(publisher: Alice, expiration: Date): Arrangement {
    const arrangementId = Uint8Array.from(secureRandom(this.ID_LENGTH));
    return new Arrangement(publisher.verifyingKey, arrangementId, expiration);
  }
}
