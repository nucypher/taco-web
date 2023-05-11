import {
  EncryptedTreasureMap,
  HRAC,
  PublicKey,
  SecretKey,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { Alice } from '../characters/alice';
import { Bob } from '../characters/bob';
import { Enrico } from '../characters/enrico';
import { tDecDecrypter } from '../characters/universal-bob';
import { ConditionSet } from '../conditions/condition-set';
import { EnactedPolicy, EnactedPolicyJSON } from '../policies/policy';
import { base64ToU8Receiver, u8ToBase64Replacer } from '../utils';

import { Cohort, CohortJSON } from './cohort';

type StrategyJSON = {
  cohort: CohortJSON;
  aliceSecretKeyBytes: Uint8Array;
  bobSecretKeyBytes: Uint8Array;
  conditionSet?: ConditionSet;
  startDate: Date;
  endDate: Date;
};

type DeployedStrategyJSON = {
  policy: EnactedPolicyJSON;
  cohortConfig: CohortJSON;
  bobSecretKeyBytes: Uint8Array;
  conditionSet?: ConditionSet;
};

export class Strategy {
  private constructor(
    public readonly cohort: Cohort,
    private readonly aliceSecretKey: SecretKey,
    private readonly bobSecretKey: SecretKey,
    private readonly startDate: Date,
    private readonly endDate: Date,
    private readonly conditionSet?: ConditionSet
  ) {}

  public static create(
    cohort: Cohort,
    conditionSet?: ConditionSet,
    aliceSecretKey?: SecretKey,
    bobSecretKey?: SecretKey,
    startDate?: Date,
    endDate?: Date
  ) {
    if (!aliceSecretKey) {
      aliceSecretKey = SecretKey.random();
    }
    if (!bobSecretKey) {
      bobSecretKey = SecretKey.random();
    }
    if (!startDate) {
      startDate = new Date(Date.now());
    }
    if (!endDate) {
      endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    }
    return new Strategy(
      cohort,
      aliceSecretKey,
      bobSecretKey,
      startDate,
      endDate,
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
      bob,
      label,
      threshold: this.cohort.configuration.threshold,
      shares: this.cohort.configuration.shares,
      startDate: this.startDate,
      endDate: this.endDate,
    };
    const policy = await alice.grant(policyParams, this.cohort.ursulaAddresses);
    const encrypter = new Enrico(
      policy.policyKey,
      undefined,
      this.conditionSet
    );

    const decrypter = new tDecDecrypter(
      this.cohort.configuration.porterUri,
      policy.policyKey,
      policy.encryptedTreasureMap,
      alice.verifyingKey,
      this.bobSecretKey
    );
    return new DeployedStrategy(
      label,
      this.cohort,
      policy,
      encrypter,
      decrypter,
      this.bobSecretKey,
      this.conditionSet
    );
  }

  public static fromJSON(json: string) {
    const config = JSON.parse(json, base64ToU8Receiver);
    return Strategy.fromObj(config);
  }

  public toJSON() {
    return JSON.stringify(this.toObj(), u8ToBase64Replacer);
  }

  private static fromObj({
    cohort,
    aliceSecretKeyBytes,
    bobSecretKeyBytes,
    conditionSet,
    startDate,
    endDate,
  }: StrategyJSON) {
    return new Strategy(
      Cohort.fromObj(cohort),
      SecretKey.fromBEBytes(aliceSecretKeyBytes),
      SecretKey.fromBEBytes(bobSecretKeyBytes),
      startDate,
      endDate,
      conditionSet
    );
  }

  public toObj(): StrategyJSON {
    return {
      cohort: this.cohort.toObj(),
      aliceSecretKeyBytes: this.aliceSecretKey.toBEBytes(),
      bobSecretKeyBytes: this.bobSecretKey.toBEBytes(),
      conditionSet: this.conditionSet,
      startDate: this.startDate,
      endDate: this.endDate,
    };
  }
}

export class DeployedStrategy {
  constructor(
    public label: string,
    public cohort: Cohort,
    public policy: EnactedPolicy,
    public encrypter: Enrico,
    public decrypter: tDecDecrypter,
    private bobSecretKey: SecretKey,
    public conditionSet?: ConditionSet
  ) {}

  public static fromJSON(json: string) {
    const config = JSON.parse(json, base64ToU8Receiver);
    return DeployedStrategy.fromObj(config);
  }

  public toJSON() {
    return JSON.stringify(this.toObj(), u8ToBase64Replacer);
  }

  private static fromObj({
    policy,
    cohortConfig,
    bobSecretKeyBytes,
    conditionSet,
  }: DeployedStrategyJSON) {
    const id = HRAC.fromBytes(policy.id);
    const policyKey = PublicKey.fromCompressedBytes(policy.policyKey);
    const encryptedTreasureMap = EncryptedTreasureMap.fromBytes(
      policy.encryptedTreasureMap
    );
    const aliceVerifyingKey = PublicKey.fromCompressedBytes(
      policy.aliceVerifyingKey
    );
    const newPolicy = {
      id,
      label: policy.label,
      policyKey,
      encryptedTreasureMap,
      aliceVerifyingKey: aliceVerifyingKey.toCompressedBytes(),
      size: policy.size,
      startTimestamp: policy.startTimestamp,
      endTimestamp: policy.endTimestamp,
      txHash: policy.txHash,
    };
    const bobSecretKey = SecretKey.fromBEBytes(bobSecretKeyBytes);
    const label = newPolicy.label;
    const cohort = Cohort.fromObj(cohortConfig);
    const encrypter = new Enrico(newPolicy.policyKey, undefined, conditionSet);

    const decrypter = new tDecDecrypter(
      cohort.configuration.porterUri,
      policyKey,
      encryptedTreasureMap,
      aliceVerifyingKey,
      bobSecretKey
    );
    return new DeployedStrategy(
      label,
      cohort,
      newPolicy,
      encrypter,
      decrypter,
      bobSecretKey,
      conditionSet
    );
  }

  private toObj(): DeployedStrategyJSON {
    const policy = {
      ...this.policy,
      id: this.policy.id.toBytes(),
      policyKey: this.policy.policyKey.toCompressedBytes(),
      encryptedTreasureMap: this.policy.encryptedTreasureMap.toBytes(),
    };
    return {
      policy,
      cohortConfig: this.cohort.toObj(),
      bobSecretKeyBytes: this.bobSecretKey.toBEBytes(),
      conditionSet: this.conditionSet,
    };
  }
}
