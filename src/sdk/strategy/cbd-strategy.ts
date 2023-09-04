import { DkgPublicKey } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import {
  ThresholdDecrypter,
  ThresholdDecrypterJSON,
} from '../../characters/cbd-recipient';
import { Enrico } from '../../characters/enrico';
import { ConditionExpression, ConditionExpressionJSON } from '../../conditions';
import { DkgClient, DkgRitual } from '../../dkg';
import { fromJSON, toJSON } from '../../utils';
import { Cohort, CohortJSON } from '../cohort';

export type CbdStrategyJSON = {
  cohort: CohortJSON;
  conditionExpr?: ConditionExpressionJSON | undefined;
};

export type DeployedStrategyJSON = {
  decrypter: ThresholdDecrypterJSON;
  dkgPublicKey: Uint8Array;
};

export class CbdStrategy {
  private constructor(public readonly cohort: Cohort) {}

  public static create(cohort: Cohort) {
    return new CbdStrategy(cohort);
  }

  public async deploy(
    provider: ethers.providers.Provider,
    ritualId: number
  ): Promise<DeployedCbdStrategy> {
    // TODO(#264): Enable ritual initialization
    // if (ritualId === undefined) {
    //   ritualId = await DkgClient.initializeRitual(
    //     provider,
    //     this.cohort.ursulaAddresses,
    //     true
    //   );
    // }
    // if (ritualId === undefined) {
    //   // Given that we just initialized the ritual, this should never happen
    //   throw new Error('Ritual ID is undefined');
    // }
    const dkgRitual = await DkgClient.getExistingRitual(provider, ritualId);
    return DeployedCbdStrategy.create(dkgRitual, this.cohort.porterUri);
  }

  public static fromJSON(json: string) {
    return CbdStrategy.fromObj(fromJSON(json));
  }

  public toJSON() {
    return toJSON(this.toObj());
  }

  public static fromObj({ cohort }: CbdStrategyJSON) {
    return new CbdStrategy(Cohort.fromObj(cohort));
  }

  public toObj(): CbdStrategyJSON {
    return {
      cohort: this.cohort.toObj(),
    };
  }

  public equals(other: CbdStrategy) {
    return this.cohort.equals(other.cohort);
  }
}

export class DeployedCbdStrategy {
  private constructor(
    public readonly decrypter: ThresholdDecrypter,
    public readonly dkgPublicKey: DkgPublicKey
  ) {}

  public static create(dkgRitual: DkgRitual, porterUri: string) {
    const decrypter = ThresholdDecrypter.create(porterUri, dkgRitual);
    return new DeployedCbdStrategy(decrypter, dkgRitual.dkgPublicKey);
  }

  // TODO: This is analogous to create() above, is it useful?
  public static async fromRitualId(
    provider: ethers.providers.Provider,
    porterUri: string,
    ritualId: number
  ): Promise<DeployedCbdStrategy> {
    const dkgRitual = await DkgClient.getExistingRitual(provider, ritualId);
    return DeployedCbdStrategy.create(dkgRitual, porterUri);
  }

  public makeEncrypter(conditionExpr: ConditionExpression): Enrico {
    return new Enrico(this.dkgPublicKey, undefined, conditionExpr);
  }

  public static fromJSON(json: string) {
    const config = fromJSON(json);
    return DeployedCbdStrategy.fromObj(config);
  }

  public toJSON() {
    return toJSON(this.toObj());
  }

  private static fromObj({ decrypter, dkgPublicKey }: DeployedStrategyJSON) {
    return new DeployedCbdStrategy(
      ThresholdDecrypter.fromObj(decrypter),
      DkgPublicKey.fromBytes(dkgPublicKey)
    );
  }

  public toObj(): DeployedStrategyJSON {
    return {
      decrypter: this.decrypter.toObj(),
      dkgPublicKey: this.dkgPublicKey.toBytes(),
    };
  }

  public equals(other: DeployedCbdStrategy) {
    return [
      this.decrypter.equals(other.decrypter),
      this.dkgPublicKey.equals(other.dkgPublicKey),
    ].every(Boolean);
  }
}
