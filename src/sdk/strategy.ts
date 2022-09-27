import { SecretKey } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { Alice } from '../characters/alice';
import { Bob } from '../characters/bob';
import { Enrico } from '../characters/enrico';
import { tDecDecrypter } from '../characters/universal-bob';
import { ConditionSet } from '../policies/conditions';
import { EnactedPolicy } from '../policies/policy';

import { Cohort } from './cohort';

export class Strategy {
  private constructor(
    public cohort: Cohort,
    public startDate: Date,
    public endDate: Date,
    private alice: Alice,
    private bob: Bob,
    private bobSecretKey: SecretKey,
    private conditionSet?: ConditionSet
  ) {}

  public static create(
    cohort: Cohort,
    startDate: Date,
    endDate: Date,
    porterUri: string,
    provider: ethers.providers.Web3Provider,
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

    const configuration = { porterUri };
    // DKG Alice can be created instead
    const alice = Alice.fromSecretKey(configuration, aliceSecretKey, provider);
    const bobSecretKey = SecretKey.random();
    const bob = new Bob(configuration, bobSecretKey);
    return new Strategy(
      cohort,
      startDate,
      endDate,
      alice,
      bob,
      bobSecretKey,
      conditionSet
    );
  }

  public async deploy(label: string): Promise<DeployedStrategy> {
    const policyParams = {
      bob: this.bob,
      label,
      threshold: this.cohort.configuration.threshold,
      shares: this.cohort.configuration.shares,
      startDate: this.startDate,
      endDate: this.endDate,
    };
    const policy = await this.alice.grant(
      policyParams,
      this.cohort.ursulaAddresses
      // excludeUrsulas
    );
    const encrypter = new Enrico(
      policy.policyKey,
      this.alice.verifyingKey,
      this.conditionSet
    );

    const decrypter = new tDecDecrypter(
      this.cohort.configuration.porterUri,
      policy.policyKey,
      policy.encryptedTreasureMap,
      this.alice.verifyingKey,
      this.bobSecretKey,
      this.bobSecretKey
    );
    return new DeployedStrategy(label, policy, encrypter, decrypter);
  }

  public static fromJson() {
    throw new Error('Method not implemented.');
  }

  public static toJson() {
    throw new Error('Method not implemented.');
  }

  public static attachConditions() {
    throw new Error('Method not implemented.');
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
  private constructor(
    public cohort: Cohort,
    public startDate: Date,
    public endDate: Date,
    private alice: Alice,
    private bob: Bob,
    private bobSecretKey: SecretKey,
    public deployed: boolean,
    private conditionSet: ConditionSet,
    public policy: EnactedPolicy,
    public encrypter: Enrico,
    public decrypter: tDecDecrypter
  ) {}
}
