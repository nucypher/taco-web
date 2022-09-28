import { SecretKey } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { Alice } from '../characters/alice';
import { Bob } from '../characters/bob';
import { Enrico } from '../characters/enrico';
import { tDecDecrypter } from '../characters/universal-bob';
import { ConditionSet } from '../policies/conditions';
import { EnactedPolicy } from '../policies/policy';

import { Cohort, CohortJSON } from './cohort';

type StrategyJSON = {
  cohort: CohortJSON;
  startDate: Date;
  endDate: Date;
  aliceSecretKey: SecretKey;
  bobSecretKey: SecretKey;
  conditionSet?: ConditionSet;
};
export class Strategy {
  private constructor(
    public readonly cohort: Cohort,
    public readonly startDate: Date,
    public readonly endDate: Date,
    private readonly aliceSecretKey: SecretKey,
    private readonly bobSecretKey: SecretKey,
    private readonly conditionSet?: ConditionSet
  ) {}

  public static create(
    cohort: Cohort,
    startDate: Date,
    endDate: Date,
    conditionSet?: ConditionSet,
    aliceSecretKey?: SecretKey,
    dkgAlice?: boolean
  ) {
    if (dkgAlice == true) {
      throw new TypeError('DKG Alice is not yet implemented');
    }
    if (!aliceSecretKey) {
      aliceSecretKey = SecretKey.random();
    }

    const bobSecretKey = SecretKey.random();
    return new Strategy(
      cohort,
      startDate,
      endDate,
      aliceSecretKey,
      bobSecretKey,
      conditionSet
    );
  }

  public async deploy(
    label: string,
    provider: ethers.providers.Web3Provider
  ): Promise<DeployedStrategy> {
    const porterUri = this.cohort.configuration.porterUri;
    const configuration = { porterUri };
    const alice = Alice.fromSecretKey(
      configuration,
      this.aliceSecretKey,
      provider
    );
    const bob = new Bob(configuration, this.bobSecretKey);
    const policyParams = {
      bob: bob,
      label,
      threshold: this.cohort.configuration.threshold,
      shares: this.cohort.configuration.shares,
      startDate: this.startDate,
      endDate: this.endDate,
    };
    const policy = await alice.grant(
      policyParams,
      this.cohort.ursulaAddresses
      // excludeUrsulas
    );
    const encrypter = new Enrico(
      policy.policyKey,
      alice.verifyingKey,
      this.conditionSet
    );

    const decrypter = new tDecDecrypter(
      this.cohort.configuration.porterUri,
      policy.policyKey,
      policy.encryptedTreasureMap,
      alice.verifyingKey,
      this.bobSecretKey,
      this.bobSecretKey
    );
    return new DeployedStrategy(label, policy, encrypter, decrypter);
  }

  public static fromJSON(json: string) {
    const config = JSON.parse(json);
    return Strategy.fromObj(config);
  }

  public toJSON() {
    return JSON.stringify(this.toObj());
  }

  private static fromObj({
    cohort,
    startDate,
    endDate,
    aliceSecretKey,
    bobSecretKey,
    conditionSet,
  }: StrategyJSON) {
    return new Strategy(
      Cohort.fromObj(cohort),
      startDate,
      endDate,
      aliceSecretKey,
      bobSecretKey,
      conditionSet
    );
  }

  private toObj(): StrategyJSON {
    return {
      cohort: this.cohort.toObj(),
      startDate: this.startDate,
      endDate: this.endDate,
      aliceSecretKey: this.aliceSecretKey,
      bobSecretKey: this.bobSecretKey,
      conditionSet: this.conditionSet,
    };
  }
}

export class DeployedStrategy {
  constructor(
    public label: string,
    public policy: EnactedPolicy,
    public encrypter: Enrico,
    public decrypter: tDecDecrypter
  ) {}

  public static revoke(): RevokedStrategy {
    throw new Error('Method not implemented.');
  }
}

export class RevokedStrategy {
  constructor(
    public label: string,
    public policy: EnactedPolicy,
    public encrypter: Enrico,
    public decrypter: tDecDecrypter
  ) {}
}
