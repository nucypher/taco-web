import secureRandom from 'secure-random';
import { KeyFrag, PublicKey, VerifiedCapsuleFrag } from 'umbral-pre';

import { PolicyManagerAgent } from '../agents/policy-manager';
import { Alice } from '../characters/alice';
import { Bob } from '../characters/bob';
import { IUrsula } from '../characters/porter';
import { keccakDigest } from '../crypto/api';
import { RevocationKit } from '../kits/revocation';
import { ChecksumAddress } from '../types';
import { fromHexString, toBytes } from '../utils';

import { PrePublishedTreasureMap, TreasureMap } from './collections';

export interface EnactedPolicy {
  id: Uint8Array;
  hrac: Uint8Array;
  label: string;
  publicKey: Uint8Array;
  treasureMap: PrePublishedTreasureMap;
  revocationKit: RevocationKit;
  aliceVerifyingKey: Uint8Array;
}

export interface ArrangementForUrsula {
  ursula: IUrsula;
  arrangement: Arrangement;
}

export interface BlockchainPolicyParameters {
  bob: Bob;
  label: string;
  m: number;
  n: number;
  expiration?: Date;
  paymentPeriods?: number;
  value?: number;
  rate?: number;
}

export class BlockchainPolicy {
  private ID_LENGTH = 16;
  private readonly policyId: Uint8Array;

  constructor(
    private readonly alice: Alice,
    private readonly label: string,
    private readonly expiration: Date,
    private bob: Bob,
    private kFrags: KeyFrag[],
    private delegatingPublicKey: PublicKey,
    private readonly m: number,
    private readonly n: number,
    private readonly value: number
  ) {
    this.alice = alice;
    this.label = label;
    this.expiration = expiration;
    this.bob = bob;
    this.kFrags = kFrags;
    this.delegatingPublicKey = delegatingPublicKey;
    this.m = m;
    this.n = n;
    this.value = value;

    this.policyId = this.constructPolicyId();
  }

  public static generatePolicyParameters(
    n: number,
    paymentPeriods: number,
    value?: number,
    rate?: number
  ): { rate: number; value: number } {
    // Check for negative inputs
    const inputs = { n, paymentPeriods, value, rate };
    for (const [input_name, input_value] of Object.entries(inputs)) {
      if (input_value && input_value < 0) {
        throw Error(`Negative policy parameters are not allowed: ${input_name} is ${input_value}`);
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
      const recalculatedValue = rate! * paymentPeriods * n;
      // TODO: Can we return here or do we need to run check below?
      return { rate: rate!, value: recalculatedValue };
    }

    const valuePerNode = Math.floor(value / n);
    if (valuePerNode * n != value) {
      throw Error(
        `Policy value of (${value} wei) cannot be divided by N (${n}) without a remainder.`
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
    const ratePerPeriod = Math.floor(value / n / paymentPeriods);
    const recalculatedValue = paymentPeriods * ratePerPeriod * n;
    if (recalculatedValue != value) {
      throw new Error(
        `Invalid policy value calculation - ${value} cant be divided into ${n} ` +
          `staker payments per period for ${paymentPeriods} periods without a remainder`
      );
    }

    return { rate: rate!, value: value! };
  }

  public async enactArrangement(
    arrangement: Arrangement,
    kFrag: VerifiedCapsuleFrag,
    ursula: IUrsula,
    publicationTransaction: Uint8Array
  ): Promise<ChecksumAddress | null> {
    const enactmentPayload = new Uint8Array([...publicationTransaction, ...kFrag.toBytes()]);
    const ursulaPublicKey = PublicKey.fromBytes(fromHexString(ursula.encryptingKey));
    const messageKit = this.alice.encryptFor(ursulaPublicKey, enactmentPayload);
    return this.alice.porter.enactPolicy(ursula, arrangement.getId(), messageKit);
  }

  public async publishToBlockchain(arrangements: ArrangementForUrsula[]): Promise<string> {
    const addresses = arrangements.map((a) => a.ursula.checksumAddress);
    const txReceipt = await PolicyManagerAgent.createPolicy(
      this.policyId,
      this.alice.transactingPower,
      this.value,
      (this.expiration.getTime() / 1000) | 0,
      addresses
    );
    // TODO: We downcast here because since we wait for tx to be mined we
    //       can be sure that `blockHash` is not undefined
    return txReceipt.blockHash!;
  }

  public async enact(ursulas: IUrsula[]): Promise<EnactedPolicy> {
    const arrangements = await this.makeArrangements(ursulas);
    await this.enactArrangements(arrangements);
    const treasureMap = this.makeTreasureMap(arrangements);
    const revocationKit = new RevocationKit(treasureMap, this.alice.signer);
    return {
      id: this.policyId,
      label: this.label,
      publicKey: this.delegatingPublicKey.toBytes(),
      treasureMap,
      revocationKit,
      aliceVerifyingKey: this.alice.verifyingKey.toBytes(),
      hrac: treasureMap.hrac,
    };
  }

  private constructPolicyId(): Uint8Array {
    return keccakDigest(
      new Uint8Array([...toBytes(this.label), ...this.bob.verifyingKey.toBytes()])
    ).slice(0, this.ID_LENGTH);
  }

  private async proposeArrangement(ursula: IUrsula): Promise<ArrangementForUrsula | null> {
    const arrangement = Arrangement.fromAlice(this.alice, this.expiration);
    const maybeAddress = await this.alice.porter.proposeArrangement(ursula, arrangement);
    if (maybeAddress) {
      return { ursula, arrangement };
    }
    return null;
  }

  private async makeArrangements(ursulas: IUrsula[]): Promise<ArrangementForUrsula[]> {
    const arrangementPromises = ursulas.map((ursula) => this.proposeArrangement(ursula));
    const maybeArrangements = await Promise.all(arrangementPromises);
    return maybeArrangements.filter((arrangement) => !!arrangement) as ArrangementForUrsula[];
  }

  private async enactArrangements(arrangements: ArrangementForUrsula[]): Promise<void> {
    const publicationTx = await this.publishToBlockchain(arrangements);
    const enactedPromises = arrangements
      .map((x, index) => ({
        ursula: x.ursula,
        arrangement: x.arrangement,
        kFrag: this.kFrags[index],
      }))
      .map(({ arrangement, kFrag, ursula }) =>
        this.enactArrangement(arrangement, kFrag, ursula, toBytes(publicationTx))
      );
    const maybeAllEnacted = await Promise.all(enactedPromises);
    const allEnacted = maybeAllEnacted.every((x) => !!x);

    if (!allEnacted) {
      const notEnacted = arrangements.filter(
        (x) => !maybeAllEnacted.includes(x.ursula.checksumAddress)
      );
      throw Error(`Failed to enact some of arrangements: ${notEnacted}`);
    }
  }

  private makeTreasureMap(arrangements: ArrangementForUrsula[]): PrePublishedTreasureMap {
    const treasureMap = new TreasureMap(this.m);
    arrangements.forEach(({ arrangement, ursula }) => {
      treasureMap.addArrangement(ursula, arrangement);
    });
    return treasureMap.prepareForPublication(
      this.bob.encryptingPublicKey,
      this.bob.verifyingKey,
      this.alice.signer,
      this.label
    );
  }
}

export class Arrangement {
  private static ID_LENGTH = 32;
  private aliceVerifyingKey: PublicKey;
  private readonly arrangementId: Uint8Array;
  private expiration: Date;

  constructor(aliceVerifyingKey: PublicKey, arrangementId: Uint8Array, expiration: Date) {
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
      ...this.arrangementId,
      ...toBytes(this.expiration.toISOString()),
    ]);
  }

  public getId(): Uint8Array {
    return this.arrangementId;
  }
}
