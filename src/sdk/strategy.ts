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
import { ConditionSet } from '../policies/conditions';
import { EnactedPolicy, EnactedPolicyJSON } from '../policies/policy';
import { base64ToU8Receiver, u8ToBase64Replacer } from '../utils';

import { Cohort, CohortJSON } from './cohort';

type StrategyJSON = {
  cohort: CohortJSON;
  aliceSecretKeyBytes: Uint8Array;
  bobSecretKeyBytes: Uint8Array;
  conditionSet?: ConditionSet;
};

type DeployedStrategyJSON = {
  policy: EnactedPolicyJSON;
  cohortConfig: CohortJSON;
  aliceSecretKeyBytes: Uint8Array;
  bobSecretKeyBytes: Uint8Array;
  conditionSet?: ConditionSet;
};

export class Strategy {
  private constructor(
    public readonly cohort: Cohort,
    private readonly aliceSecretKey: SecretKey,
    private readonly bobSecretKey: SecretKey,
    private readonly conditionSet?: ConditionSet
  ) {}

  public static create(
    cohort: Cohort,
    conditionSet?: ConditionSet,
    aliceSecretKey?: SecretKey,
    bobSecretKey?: SecretKey
  ) {
    if (!aliceSecretKey) {
      aliceSecretKey = SecretKey.random();
    }
    if (!bobSecretKey) {
      bobSecretKey = SecretKey.random();
    }
    return new Strategy(cohort, aliceSecretKey, bobSecretKey, conditionSet);
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
      startDate: new Date(Date.now()),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    };
    const policy = await alice.grant(policyParams, this.cohort.ursulaAddresses);
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
      this.bobSecretKey
    );
    return new DeployedStrategy(
      label,
      this.cohort,
      policy,
      encrypter,
      decrypter,
      this.aliceSecretKey,
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
  }: StrategyJSON) {
    return new Strategy(
      Cohort.fromObj(cohort),
      SecretKey.fromBytes(aliceSecretKeyBytes),
      SecretKey.fromBytes(bobSecretKeyBytes),
      conditionSet
    );
  }

  public toObj(): StrategyJSON {
    return {
      cohort: this.cohort.toObj(),
      aliceSecretKeyBytes: this.aliceSecretKey.toSecretBytes(),
      bobSecretKeyBytes: this.bobSecretKey.toSecretBytes(),
      conditionSet: this.conditionSet,
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
    private aliceSecretKey: SecretKey,
    private bobSecretKey: SecretKey,
    public conditionSet?: ConditionSet
  ) {}

  public revoke(provider: ethers.providers.Web3Provider): RevokedStrategy {
    throw new Error('Method not implemented.');
  }

  public static fromJSON(
    provider: ethers.providers.Web3Provider,
    json: string
  ) {
    const config = JSON.parse(json, base64ToU8Receiver);
    return DeployedStrategy.fromObj(provider, config);
  }

  public toJSON() {
    return JSON.stringify(this.toObj(), u8ToBase64Replacer);
  }

  private static fromObj(
    provider: ethers.providers.Web3Provider,
    {
      policy,
      cohortConfig,
      aliceSecretKeyBytes,
      bobSecretKeyBytes,
      conditionSet,
    }: DeployedStrategyJSON
  ) {
    const id = HRAC.fromBytes(policy.id);
    const policyKey = PublicKey.fromBytes(policy.policyKey);
    const encryptedTreasureMap = EncryptedTreasureMap.fromBytes(
      policy.encryptedTreasureMap
    );
    const newPolicy = {
      id,
      label: policy.label,
      policyKey,
      encryptedTreasureMap,
      aliceVerifyingKey: new Uint8Array(policy.aliceVerifyingKey),
      size: policy.size,
      startTimestamp: policy.startTimestamp,
      endTimestamp: policy.endTimestamp,
      txHash: policy.txHash,
    };
    const aliceSecretKey = SecretKey.fromBytes(aliceSecretKeyBytes);
    const bobSecretKey = SecretKey.fromBytes(bobSecretKeyBytes);
    const label = newPolicy.label;
    const cohort = Cohort.fromObj(cohortConfig);
    const porterUri = cohort.configuration.porterUri;
    const configuration = { porterUri };
    const alice = Alice.fromSecretKey(configuration, aliceSecretKey, provider);
    const encrypter = new Enrico(
      newPolicy.policyKey,
      alice.verifyingKey,
      conditionSet
    );

    const decrypter = new tDecDecrypter(
      cohort.configuration.porterUri,
      policyKey,
      encryptedTreasureMap,
      alice.verifyingKey,
      bobSecretKey
    );
    return new DeployedStrategy(
      label,
      cohort,
      newPolicy,
      encrypter,
      decrypter,
      aliceSecretKey,
      bobSecretKey,
      conditionSet
    );
  }

  private toObj(): DeployedStrategyJSON {
    const policy = {
      ...this.policy,
      id: this.policy.id.toBytes(),
      policyKey: this.policy.policyKey.toBytes(),
      encryptedTreasureMap: this.policy.encryptedTreasureMap.toBytes(),
    };
    return {
      policy,
      cohortConfig: this.cohort.toObj(),
      aliceSecretKeyBytes: this.aliceSecretKey.toSecretBytes(),
      bobSecretKeyBytes: this.bobSecretKey.toSecretBytes(),
      conditionSet: this.conditionSet,
    };
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
