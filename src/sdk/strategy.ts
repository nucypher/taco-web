import { SecretKey } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { EnactedPolicy } from '../policies/policy';
import { Alice } from '../characters/alice';
import { Bob } from '../characters/bob';
import { Enrico } from '../characters/enrico';
import { tDecDecrypter } from '../characters/universal-bob';

import { Cohort } from './cohort';

export class Strategy {
  private constructor(
    public cohort: Cohort,
    public startDate: Date,
    public endDate: Date,
    private alice: Alice,
    private bob: Bob,
    private bobSecretKey: SecretKey,
    public deployed: boolean,
    public policy?: EnactedPolicy,
    public encrypter?: Enrico,
    public decrypter?: tDecDecrypter,
  ) {}

  public static create(
    cohort: Cohort,
    startDate: Date,
    endDate: Date,
    porterUri: string,
    provider: ethers.providers.Web3Provider,
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
      false
    );
  }

  public static fromJson() {
    throw new Error('Method not implemented.');
  }

  public static toJson() {
    throw new Error('Method not implemented.');
  }

  public async deploy(label: string) {
    const { threshold, shares } = this.cohort; // shares can be defined on Cohort as a getter method
    const { bob, startDate, endDate } = this;
    const policyParams = {
      bob,
      label,
      threshold,
      shares,
      startDate,
      endDate,
    };
    this.policy = await this.alice.grant(
      policyParams,
      this.cohort.ursulaAddresses
    );
    this.deployed = true;
    return this.policy;
  }

  public getEncrypter() {
    if (this.deployed !== true) {
      throw new Error('Policy has not yet been deployed.');
    } else if (typeof this.policy == 'undefined') {
      throw new Error('Policy has not yet been built.');
    } else {
      this.encrypter = new Enrico(
        this.policy.policyKey,
        this.alice.verifyingKey
      );
      return this.encrypter;
    }
  }

  public getDecrypter() {
    if (this.deployed !== true) {
      throw new Error('Policy has not yet been deployed.');
    } else if (typeof this.policy == 'undefined') {
      throw new Error('Policy has not yet been built.');
    } else {
      this.decrypter = new tDecDecrypter(
        this.cohort.porterUri,
        this.policy.policyKey,
        this.policy.encryptedTreasureMap,
        this.alice.verifyingKey,
        this.bobSecretKey,
        this.bobSecretKey
      );
    }
  }

  public static revoke() {
    throw new Error('Method not implemented.');
  }

  public static attachConditions() {
    throw new Error('Method not implemented.');
  }
}
