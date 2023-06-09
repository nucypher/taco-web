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
  conditionSet?: ConditionSetJSON | undefined;
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

    const encrypter = new Enrico(
      dkgRitual.dkgPublicKey,
      undefined,
      this.conditionSet
    );

    const decrypter = new CbdTDecDecrypter(
      this.cohort.configuration.porterUri,
      this.cohort.configuration.threshold
    );

    return new DeployedCbdStrategy(
      this.cohort,
      dkgRitual,
      encrypter,
      decrypter,
      this.conditionSet
    );
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
        : false;
    return this.cohort.equals(other.cohort) && conditionSetEquals;
  }
}

export class DeployedCbdStrategy {
  constructor(
    public cohort: Cohort,
    public dkgRitual: DkgRitual,
    public encrypter: Enrico,
    public decrypter: CbdTDecDecrypter,
    public conditionSet?: ConditionSet
  ) {}

  public static fromJSON(json: string) {
    const config = fromJSON(json);
    return DeployedCbdStrategy.fromObj(config);
  }

  public toJSON() {
    return toJSON(this.toObj());
  }

  private static fromObj({
    dkgRitual,
    cohortConfig,
    conditionSet,
  }: DeployedStrategyJSON) {
    const ritual = DkgRitual.fromObj(dkgRitual);
    const cohort = Cohort.fromObj(cohortConfig);
    const maybeConditionSet = conditionSet
      ? ConditionSet.fromObj(conditionSet)
      : undefined;
    const encrypter = new Enrico(
      ritual.dkgPublicKey,
      undefined,
      maybeConditionSet
    );
    const decrypter = new CbdTDecDecrypter(
      cohort.configuration.porterUri,
      cohort.configuration.threshold
    );
    return new DeployedCbdStrategy(
      cohort,
      ritual,
      encrypter,
      decrypter,
      maybeConditionSet
    );
  }

  public toObj(): DeployedStrategyJSON {
    return {
      dkgRitual: this.dkgRitual.toObj(),
      cohortConfig: this.cohort.toObj(),
      conditionSet: this.conditionSet?.toObj(),
    };
  }

  public equals(other: DeployedCbdStrategy) {
    const conditionSetEquals =
      this.conditionSet && other.conditionSet
        ? this.conditionSet.equals(other.conditionSet)
        : false;
    return (
      this.cohort.equals(other.cohort) &&
      conditionSetEquals &&
      objectEquals(this.dkgRitual.toObj(), other.dkgRitual.toObj())
    );
  }
}
