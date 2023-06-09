import {
  EncryptedTreasureMap,
  HRAC,
  PublicKey,
  SecretKey,
} from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { Alice } from '../../characters/alice';
import { Bob } from '../../characters/bob';
import { Enrico } from '../../characters/enrico';
import { PreTDecDecrypter } from '../../characters/pre-recipient';
import { ConditionSet, ConditionSetJSON } from '../../conditions';
import { EnactedPolicy, EnactedPolicyJSON } from '../../policies/policy';
import { base64ToU8Receiver, bytesEquals, toJSON } from '../../utils';
import { Cohort, CohortJSON } from '../cohort';

export type PreStrategyJSON = {
  cohort: CohortJSON;
  aliceSecretKeyBytes: Uint8Array;
  bobSecretKeyBytes: Uint8Array;
  conditionSet?: ConditionSetJSON;
  startDate: Date;
  endDate: Date;
};

export type DeployedPreStrategyJSON = {
  policy: EnactedPolicyJSON;
  cohortConfig: CohortJSON;
  bobSecretKeyBytes: Uint8Array;
  conditionSet?: ConditionSetJSON;
};

export class PreStrategy {
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
    return new PreStrategy(
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
  ): Promise<DeployedPreStrategy> {
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

    const decrypter = new PreTDecDecrypter(
      this.cohort.configuration.porterUri,
      policy.policyKey,
      policy.encryptedTreasureMap,
      alice.verifyingKey,
      this.bobSecretKey
    );
    return new DeployedPreStrategy(
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
    config.startDate = new Date(config.startDate);
    config.endDate = new Date(config.endDate);
    return PreStrategy.fromObj(config);
  }

  public toJSON() {
    return toJSON(this.toObj());
  }

  public static fromObj({
    cohort,
    aliceSecretKeyBytes,
    bobSecretKeyBytes,
    conditionSet,
    startDate,
    endDate,
  }: PreStrategyJSON) {
    return new PreStrategy(
      Cohort.fromObj(cohort),
      SecretKey.fromBEBytes(aliceSecretKeyBytes),
      SecretKey.fromBEBytes(bobSecretKeyBytes),
      new Date(startDate),
      new Date(endDate),
      conditionSet ? ConditionSet.fromObj(conditionSet) : undefined
    );
  }

  public toObj(): PreStrategyJSON {
    return {
      cohort: this.cohort.toObj(),
      aliceSecretKeyBytes: this.aliceSecretKey.toBEBytes(),
      bobSecretKeyBytes: this.bobSecretKey.toBEBytes(),
      conditionSet: this.conditionSet ? this.conditionSet.toObj() : undefined,
      startDate: this.startDate,
      endDate: this.endDate,
    };
  }

  public equals(other: PreStrategy) {
    const conditionSetEquals =
      this.conditionSet && other.conditionSet
        ? this.conditionSet.equals(other.conditionSet)
        : this.conditionSet === other.conditionSet;
    return (
      this.cohort.equals(other.cohort) &&
      // TODO: Add equality to WASM bindings
      bytesEquals(
        this.aliceSecretKey.toBEBytes(),
        other.aliceSecretKey.toBEBytes()
      ) &&
      bytesEquals(
        this.bobSecretKey.toBEBytes(),
        other.bobSecretKey.toBEBytes()
      ) &&
      conditionSetEquals &&
      this.startDate.toString() === other.startDate.toString() &&
      this.endDate.toString() === other.endDate.toString()
    );
  }
}

export class DeployedPreStrategy {
  constructor(
    public label: string,
    public cohort: Cohort,
    public policy: EnactedPolicy,
    public encrypter: Enrico,
    public decrypter: PreTDecDecrypter,
    private bobSecretKey: SecretKey,
    public conditionSet?: ConditionSet
  ) {}

  public static fromJSON(json: string) {
    const config = JSON.parse(json, base64ToU8Receiver);
    return DeployedPreStrategy.fromObj(config);
  }

  public toJSON() {
    return toJSON(this.toObj());
  }

  public static fromObj({
    policy,
    cohortConfig,
    bobSecretKeyBytes,
    conditionSet,
  }: DeployedPreStrategyJSON) {
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

    const conditionSetOrUndefined = conditionSet
      ? ConditionSet.fromObj(conditionSet)
      : undefined;
    const encrypter = new Enrico(
      newPolicy.policyKey,
      undefined,
      conditionSetOrUndefined
    );

    const decrypter = new PreTDecDecrypter(
      cohort.configuration.porterUri,
      policyKey,
      encryptedTreasureMap,
      aliceVerifyingKey,
      bobSecretKey
    );
    return new DeployedPreStrategy(
      label,
      cohort,
      newPolicy,
      encrypter,
      decrypter,
      bobSecretKey,
      conditionSetOrUndefined
    );
  }

  public toObj(): DeployedPreStrategyJSON {
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
      conditionSet: this.conditionSet?.toObj(),
    };
  }

  public equals(other: DeployedPreStrategy) {
    const conditionSetEquals =
      this.conditionSet && other.conditionSet
        ? this.conditionSet.equals(other.conditionSet)
        : this.conditionSet === other.conditionSet;
    return (
      this.label === other.label &&
      this.cohort.equals(other.cohort) &&
      bytesEquals(this.policy.id.toBytes(), other.policy.id.toBytes()) &&
      this.policy.label === other.policy.label &&
      this.policy.policyKey.equals(other.policy.policyKey) &&
      bytesEquals(
        this.policy.encryptedTreasureMap.toBytes(),
        other.policy.encryptedTreasureMap.toBytes()
      ) &&
      conditionSetEquals
    );
  }
}
