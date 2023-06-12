import { ethers } from 'ethers';

import { CbdTDecDecrypter } from '../../characters/cbd-recipient';
import { Enrico } from '../../characters/enrico';
import { ConditionSet, ConditionSetJSON } from '../../conditions';
import { DkgClient, DkgRitual, DkgRitualJSON } from '../../dkg';
import { fromJSON, objectEquals, toJSON } from '../../utils';
import { Cohort, CohortJSON } from '../cohort';

export type CbdStrategyJSON = {
  cohort: CohortJSON;
  conditionSet?: ConditionSetJSON | undefined;
};

export type DeployedStrategyJSON = {
  dkgRitual: DkgRitualJSON;
  cohortConfig: CohortJSON;
};

export class CbdStrategy {
  private constructor(
    public readonly cohort: Cohort,
    private readonly conditionSet?: ConditionSet
  ) {}

  public static create(cohort: Cohort, conditionSet?: ConditionSet) {
    return new CbdStrategy(cohort, conditionSet);
  }

  public async deploy(
    provider: ethers.providers.Web3Provider
  ): Promise<DeployedCbdStrategy> {
    const dkgRitualParams = {
      threshold: this.cohort.configuration.threshold,
      shares: this.cohort.configuration.shares,
    };
    const dkgClient = new DkgClient(provider);
    const dkgRitual = await dkgClient.initializeRitual(
      provider,
      dkgRitualParams
    );
    return new DeployedCbdStrategy(this.cohort, dkgRitual);
  }

  public static fromJSON(json: string) {
    return CbdStrategy.fromObj(fromJSON(json));
  }

  public toJSON() {
    return toJSON(this.toObj());
  }

  public static fromObj({ cohort, conditionSet }: CbdStrategyJSON) {
    const maybeConditionSet = conditionSet
      ? ConditionSet.fromObj(conditionSet)
      : undefined;
    return new CbdStrategy(Cohort.fromObj(cohort), maybeConditionSet);
  }

  public toObj(): CbdStrategyJSON {
    return {
      cohort: this.cohort.toObj(),
      conditionSet: this.conditionSet?.toObj(),
    };
  }

  public equals(other: CbdStrategy) {
    const conditionSetEquals =
      this.conditionSet && other.conditionSet
        ? this.conditionSet.equals(other.conditionSet)
        : this.conditionSet === other.conditionSet;
    return this.cohort.equals(other.cohort) && conditionSetEquals;
  }
}

export class DeployedCbdStrategy {
  public readonly decrypter: CbdTDecDecrypter;

  public constructor(
    public readonly cohort: Cohort,
    public readonly dkgRitual: DkgRitual
  ) {
    this.decrypter = new CbdTDecDecrypter(this.cohort.configuration.porterUri);
  }

  public makeEncrypter(conditionSet: ConditionSet): Enrico {
    return new Enrico(this.dkgRitual.dkgPublicKey, undefined, conditionSet);
  }

  public static fromJSON(json: string) {
    const config = fromJSON(json);
    return DeployedCbdStrategy.fromObj(config);
  }

  public toJSON() {
    return toJSON(this.toObj());
  }

  private static fromObj({ dkgRitual, cohortConfig }: DeployedStrategyJSON) {
    const ritual = DkgRitual.fromObj(dkgRitual);
    const cohort = Cohort.fromObj(cohortConfig);
    return new DeployedCbdStrategy(cohort, ritual);
  }

  public toObj(): DeployedStrategyJSON {
    return {
      dkgRitual: this.dkgRitual.toObj(),
      cohortConfig: this.cohort.toObj(),
    };
  }

  public equals(other: DeployedCbdStrategy) {
    return (
      this.decrypter.equals(other.decrypter) &&
      this.cohort.equals(other.cohort) &&
      objectEquals(this.dkgRitual.toObj(), other.dkgRitual.toObj())
    );
  }
}
