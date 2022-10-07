import { SecretKey } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { Alice } from '../characters/alice';
import { Bob } from '../characters/bob';
import { Enrico } from '../characters/enrico';
import { tDecDecrypter } from '../characters/universal-bob';
import { ConditionSet } from '../policies/conditions';
import { EnactedPolicy } from '../policies/policy';
import {
  base64ToU8Receiver,
  fromBase64,
  toBase64,
  u8ToBase64Replacer,
} from '../utils';
import { Web3Provider } from '../web3';

import { Cohort, CohortJSON } from './cohort';

type StrategyJSON = {
  cohort: CohortJSON;
  startDate: Date;
  endDate: Date;
  aliceSecretKeyBytes: Uint8Array;
  bobSecretKeyBytes: Uint8Array;
  conditionSet?: ConditionSet;
};

type DeployedStrategyJSON = {
  policy: EnactedPolicy;
  cohortConfig: CohortJSON;
  aliceSecretKeyBytes: Uint8Array;
  bobSecretKeyBytes: Uint8Array;
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
    bobSecretKey?: SecretKey,
    dkgAlice?: boolean
  ) {
    if (dkgAlice == true) {
      throw new TypeError('DKG Alice is not yet implemented');
    }
    if (!aliceSecretKey) {
      aliceSecretKey = SecretKey.random();
    }
    if (!bobSecretKey) {
      bobSecretKey = SecretKey.random();
    }
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
      this.bobSecretKey,
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
    const base64ToU8Receiver = (
      key: string,
      value: string | number | Uint8Array
    ) => {
      if (typeof value === 'string' && value.startsWith('base64:')) {
        return fromBase64(value.split('base64:')[1]);
      }
      return value;
    };
    const config = JSON.parse(json, base64ToU8Receiver);
    return Strategy.fromObj(config);
  }

  public toJSON() {
    const u8ToBase64Replacer = (
      key: string,
      value: string | number | Uint8Array
    ) => {
      if (value instanceof Uint8Array) {
        return `base64:${toBase64(value)}`;
      }
      return value;
    };
    return JSON.stringify(this.toObj(), u8ToBase64Replacer);
  }

  private static fromObj({
    cohort,
    startDate,
    endDate,
    aliceSecretKeyBytes,
    bobSecretKeyBytes,
    conditionSet,
  }: StrategyJSON) {
    return new Strategy(
      Cohort.fromObj(cohort),
      startDate,
      endDate,
      SecretKey.fromBytes(aliceSecretKeyBytes),
      SecretKey.fromBytes(bobSecretKeyBytes),
      conditionSet
    );
  }

  public toObj(): StrategyJSON {
    return {
      cohort: this.cohort.toObj(),
      startDate: this.startDate,
      endDate: this.endDate,
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
    const newPolicy = {
      id: policy.id,
      label: policy.label,
      policyKey: policy.policyKey,
      encryptedTreasureMap: policy.encryptedTreasureMap,
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
      newPolicy.policyKey,
      newPolicy.encryptedTreasureMap,
      alice.verifyingKey,
      bobSecretKey,
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
    return {
      policy: this.policy,
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
