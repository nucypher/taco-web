import { ethers } from 'ethers';

import { CbdTDecDecrypter } from '../../characters/cbd-universal-bob';
import { Enrico } from '../../characters/enrico';
import { ConditionSet } from '../../conditions';
import { DkgClient, DkgRitual, DkgRitualJSON } from '../../dkg';
import { base64ToU8Receiver, u8ToBase64Replacer } from '../../utils';
import { Cohort, CohortJSON } from '../cohort';

type StrategyJSON = {
  cohort: CohortJSON;
  conditionSet?: ConditionSet;
};

type DeployedStrategyJSON = {
  dkgRitual: DkgRitualJSON;
  cohortConfig: CohortJSON;
  conditionSet?: ConditionSet;
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
      dkgRitual.dkgPublicKey
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
    const config = JSON.parse(json, base64ToU8Receiver);
    return CbdStrategy.fromObj(config);
  }

  public toJSON() {
    return JSON.stringify(this.toObj(), u8ToBase64Replacer);
  }

  private static fromObj({ cohort, conditionSet }: StrategyJSON) {
    return new CbdStrategy(Cohort.fromObj(cohort), conditionSet);
  }

  public toObj(): StrategyJSON {
    return {
      cohort: this.cohort.toObj(),
      conditionSet: this.conditionSet,
    };
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
    const config = JSON.parse(json, base64ToU8Receiver);
    return DeployedCbdStrategy.fromObj(config);
  }

  public toJSON() {
    return JSON.stringify(this.toObj(), u8ToBase64Replacer);
  }

  private static fromObj({
    dkgRitual,
    cohortConfig,
    conditionSet,
  }: DeployedStrategyJSON) {
    const ritual = DkgRitual.fromObj(dkgRitual);
    const cohort = Cohort.fromObj(cohortConfig);
    const encrypter = new Enrico(ritual.dkgPublicKey, undefined, conditionSet);

    const decrypter = new CbdTDecDecrypter(
      cohort.configuration.porterUri,
      ritual.dkgPublicKey
    );
    return new DeployedCbdStrategy(
      cohort,
      ritual,
      encrypter,
      decrypter,
      conditionSet
    );
  }

  public toObj(): DeployedStrategyJSON {
    return {
      dkgRitual: this.dkgRitual.toObj(),
      cohortConfig: this.cohort.toObj(),
      conditionSet: this.conditionSet,
    };
  }
}
