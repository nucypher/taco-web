import secureRandom from 'secure-random';
import { PublicKey, VerifiedKeyFrag } from 'umbral-pre';

import { PolicyManagerAgent } from '../agents/policy-manager';
import { Alice } from '../characters/alice';
import { Bob } from '../characters/bob';
import { Ursula } from '../characters/porter';
import { RevocationKit } from '../kits/revocation';
import { encodeVariableLengthMessage, toBytes } from '../utils';

import { EncryptedTreasureMap, TreasureMap } from './collections';
import { HRAC } from './hrac';

export interface EnactedPolicy {
  id: HRAC;
  hrac: HRAC;
  label: string;
  policyKey: PublicKey;
  encryptedTreasureMap: EncryptedTreasureMap;
  revocationKit: RevocationKit;
  aliceVerifyingKey: Uint8Array;
}

interface ArrangementForUrsula {
  ursula: Ursula;
  arrangement: Arrangement;
}

export interface BlockchainPolicyParameters {
  bob: Bob;
  label: string;
  threshold: number;
  shares: number;
  expiration?: Date;
  paymentPeriods: number;
  value?: number;
  rate?: number;
}

export class BlockchainPolicy {
  private readonly hrac: HRAC;

  constructor(
    private readonly publisher: Alice,
    private readonly label: string,
    private readonly expiration: Date,
    private bob: Bob,
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

  public static generatePolicyParameters(
    shares: number,
    paymentPeriods: number,
    value?: number,
    rate?: number
  ): { rate: number; value: number } {
    // Check for negative inputs
    const inputs = { shares, paymentPeriods, value, rate };
    for (const [input_name, input_value] of Object.entries(inputs)) {
      if (input_value && input_value < 0) {
        throw Error(
          `Negative policy parameters are not allowed: ${input_name} is ${input_value}`
        );
      }
    }

    // Check for policy params
    const hasNoValue = value === undefined || value === 0;
    const hasNoRate = rate === undefined || rate === 0;
    if (hasNoValue && hasNoRate) {
      // Support a min fee rate of 0
      throw Error(
        `Either 'value' or 'rate'  must be provided for policy. Got value: ${value} and rate: ${rate}`
      );
    }

    if (value === undefined) {
      const recalculatedValue = rate! * paymentPeriods * shares;
      // TODO: Can we return here or do we need to also run check below?
      return { rate: rate!, value: recalculatedValue };
    }

    const valuePerNode = Math.floor(value / shares);
    if (valuePerNode * shares != value) {
      throw Error(
        `Policy value of (${value} wei) cannot be divided by N (${shares}) without a remainder.`
      );
    }

    const recalculatedRate = Math.floor(valuePerNode / paymentPeriods);
    if (recalculatedRate * paymentPeriods !== valuePerNode) {
      throw Error(
        `Policy value of (${valuePerNode} wei) per node cannot be divided by duration ` +
          `(${paymentPeriods} periods) without a remainder.`
      );
    }

    // TODO: This check feels redundant
    const ratePerPeriod = Math.floor(value / shares / paymentPeriods);
    const recalculatedValue = paymentPeriods * ratePerPeriod * shares;
    if (recalculatedValue != value) {
      throw new Error(
        `Invalid policy value calculation - ${value} cant be divided into ${shares} ` +
          `staker payments per period for ${paymentPeriods} periods without a remainder`
      );
    }

    return { rate: rate!, value: value! };
  }

  public async publishToBlockchain(
    arrangements: ArrangementForUrsula[]
  ): Promise<string> {
    const addresses = arrangements.map((a) => a.ursula.checksumAddress);
    const txReceipt = await PolicyManagerAgent.createPolicy(
      this.hrac.toBytes(),
      this.publisher.transactingPower,
      this.value,
      (this.expiration.getTime() / 1000) | 0,
      addresses
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
      this.threshold
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
      hrac: this.hrac,
    };
  }

  private encryptTreasureMap(
    treasureMap: TreasureMap
  ): Promise<EncryptedTreasureMap> {
    return treasureMap.encrypt(this.publisher, this.bob);
  }

  private async makeArrangements(
    ursulas: Ursula[]
  ): Promise<ArrangementForUrsula[]> {
    return ursulas.map((ursula) => {
      const arrangement = Arrangement.fromAlice(
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

export class Arrangement {
  private static ID_LENGTH = 32;
  private aliceVerifyingKey: PublicKey;
  public readonly arrangementId: Uint8Array;
  private expiration: Date;

  constructor(
    aliceVerifyingKey: PublicKey,
    arrangementId: Uint8Array,
    expiration: Date
  ) {
    this.aliceVerifyingKey = aliceVerifyingKey;
    this.arrangementId = arrangementId;
    this.expiration = expiration;
  }

  public static fromAlice(alice: Alice, expiration: Date): Arrangement {
    const arrangementId = Uint8Array.from(secureRandom(this.ID_LENGTH));
    return new Arrangement(alice.verifyingKey, arrangementId, expiration);
  }

  public toBytes(): Uint8Array {
    return new Uint8Array([
      ...this.aliceVerifyingKey.toBytes(),
      ...encodeVariableLengthMessage(toBytes(this.expiration.toISOString())),
    ]);
  }
}
