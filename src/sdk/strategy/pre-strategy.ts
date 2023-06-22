import { PublicKey, SecretKey } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { Alice } from '../../characters/alice';
import { Bob } from '../../characters/bob';
import { Enrico } from '../../characters/enrico';
import {
  PreTDecDecrypter,
  PreTDecDecrypterJSON,
} from '../../characters/pre-recipient';
import { ConditionExpression } from '../../conditions';
import { EnactedPolicy } from '../../policies/policy';
import { base64ToU8Receiver, bytesEquals, toJSON } from '../../utils';
import { Cohort, CohortJSON } from '../cohort';

export type PreStrategyJSON = {
  cohort: CohortJSON;
  aliceSecretKeyBytes: Uint8Array;
  bobSecretKeyBytes: Uint8Array;
  startDate: Date;
  endDate: Date;
};

export type DeployedPreStrategyJSON = {
  cohortConfig: CohortJSON;
  decrypterJSON: PreTDecDecrypterJSON;
  policyKeyBytes: Uint8Array;
};

export class PreStrategy {
  private constructor(
    public readonly cohort: Cohort,
    private readonly aliceSecretKey: SecretKey,
    private readonly bobSecretKey: SecretKey,
    private readonly startDate: Date,
    private readonly endDate: Date
  ) {}

  public static create(
    cohort: Cohort,
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
      endDate
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
    return DeployedPreStrategy.create(this.cohort, policy, this.bobSecretKey);
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
    startDate,
    endDate,
  }: PreStrategyJSON) {
    return new PreStrategy(
      Cohort.fromObj(cohort),
      SecretKey.fromBEBytes(aliceSecretKeyBytes),
      SecretKey.fromBEBytes(bobSecretKeyBytes),
      new Date(startDate),
      new Date(endDate)
    );
  }

  public toObj(): PreStrategyJSON {
    return {
      cohort: this.cohort.toObj(),
      aliceSecretKeyBytes: this.aliceSecretKey.toBEBytes(),
      bobSecretKeyBytes: this.bobSecretKey.toBEBytes(),
      startDate: this.startDate,
      endDate: this.endDate,
    };
  }

  public equals(other: PreStrategy) {
    return (
      this.cohort.equals(other.cohort) &&
      // TODO: Replace with `equals` after https://github.com/nucypher/nucypher-core/issues/56 is fixed
      bytesEquals(
        this.aliceSecretKey.toBEBytes(),
        other.aliceSecretKey.toBEBytes()
      ) &&
      bytesEquals(
        this.bobSecretKey.toBEBytes(),
        other.bobSecretKey.toBEBytes()
      ) &&
      this.startDate.toString() === other.startDate.toString() &&
      this.endDate.toString() === other.endDate.toString()
    );
  }
}

export class DeployedPreStrategy {
  private constructor(
    public readonly cohort: Cohort,
    public readonly decrypter: PreTDecDecrypter,
    public readonly policyKey: PublicKey
  ) {}

  public static create(
    cohort: Cohort,
    policy: EnactedPolicy,
    bobSecretKey: SecretKey
  ) {
    const decrypter = PreTDecDecrypter.create(
      cohort.configuration.porterUri,
      bobSecretKey,
      policy.policyKey,
      policy.aliceVerifyingKey,
      policy.encryptedTreasureMap
    );
    return new DeployedPreStrategy(cohort, decrypter, policy.policyKey);
  }

  public makeEncrypter(conditionExpr: ConditionExpression): Enrico {
    return new Enrico(this.policyKey, undefined, conditionExpr);
  }

  public static fromJSON(json: string) {
    const config = JSON.parse(json, base64ToU8Receiver);
    return DeployedPreStrategy.fromObj(config);
  }

  public toJSON() {
    return toJSON(this.toObj());
  }

  public static fromObj({
    cohortConfig,
    decrypterJSON,
    policyKeyBytes,
  }: DeployedPreStrategyJSON) {
    const cohort = Cohort.fromObj(cohortConfig);
    const decrypter = PreTDecDecrypter.fromObj(decrypterJSON);
    const policyKey = PublicKey.fromCompressedBytes(policyKeyBytes);
    return new DeployedPreStrategy(cohort, decrypter, policyKey);
  }

  public toObj(): DeployedPreStrategyJSON {
    return {
      cohortConfig: this.cohort.toObj(),
      decrypterJSON: this.decrypter.toObj(),
      policyKeyBytes: this.policyKey.toCompressedBytes(),
    };
  }

  public equals(other: DeployedPreStrategy) {
    return (
      this.cohort.equals(other.cohort) &&
      this.decrypter.equals(other.decrypter) &&
      this.policyKey.equals(other.policyKey)
    );
  }
}
