import { DkgPublicKey } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { bytesEqual } from '../../../test/utils';
import {
  CbdTDecDecrypter,
  CbdTDecDecrypterJSON,
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
  decrypter: CbdTDecDecrypterJSON;
  dkgPublicKey: Uint8Array;
};

export class CbdStrategy {
  private constructor(public readonly cohort: Cohort) {}

  public static create(cohort: Cohort) {
    return new CbdStrategy(cohort);
  }

  public async deploy(
    provider: ethers.providers.Web3Provider
  ): Promise<DeployedCbdStrategy> {
    const dkgRitualParams = {
      threshold: this.cohort.configuration.threshold,
      shares: this.cohort.configuration.shares,
    };
    const dkgClient = new DkgClient(provider);
    const dkgRitual = await dkgClient.initializeRitual(dkgRitualParams);
    return DeployedCbdStrategy.create(this.cohort, dkgRitual);
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
    public readonly decrypter: CbdTDecDecrypter,
    public readonly dkgPublicKey: DkgPublicKey
  ) {}

  public static create(cohort: Cohort, dkgRitual: DkgRitual) {
    const decrypter = CbdTDecDecrypter.create(
      cohort.configuration.porterUri,
      dkgRitual
    );
    return new DeployedCbdStrategy(decrypter, dkgRitual.dkgPublicKey);
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
      CbdTDecDecrypter.fromObj(decrypter),
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
    return (
      this.decrypter.equals(other.decrypter) &&
      bytesEqual(this.dkgPublicKey.toBytes(), other.dkgPublicKey.toBytes())
    );
  }
}
