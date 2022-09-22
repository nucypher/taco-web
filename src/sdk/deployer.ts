import { ethers } from 'ethers';

import { Strategy } from './strategy';

export class Cohort {
  public strategies: { [key: string]: Strategy };
  private constructor(public provider: ethers.providers.Web3Provider) {
    this.strategies = {};
  }

  public add(strategyLabel: string, strategy: Strategy) {
    this.strategies[strategyLabel] = strategy;
  }

  public async deploy(strategyLabel: string) {
    throw new Error('Method not implemented.');
    // const { threshold, shares } = this.cohort; // shares can be defined on Cohort as a getter method
    // const { bob, startDate, endDate } = this;
    // const policyParams = {
    //   bob,
    //   label,
    //   threshold,
    //   shares,
    //   startDate,
    //   endDate,
    // };
    // this.policy = await this.alice.grant(
    //   policyParams,
    //   this.cohort.ursulaAddresses
    // );
    // this.deployed = true;
    // return this.policy;
  }

  public async revoke(strategyLabel: string) {
    throw new Error('Method not implemented.');
  }

  public getEncrypter(strategyLabel: string) {
    throw new Error('Method not implemented.');
    // if (this.deployed !== true) {
    //   throw new Error('Policy has not yet been deployed.');
    // } else if (typeof this.policy == 'undefined') {
    //   throw new Error('Policy has not yet been built.');
    // } else {
    //   this.encrypter = new Enrico(
    //     this.policy.policyKey,
    //     this.alice.verifyingKey,
    //     this.conditionSet
    //   );
    //   return this.encrypter;
    // }
  }

  public getDecrypter(strategyLabel: string) {
    throw new Error('Method not implemented.');
    // if (this.deployed !== true) {
    //   throw new Error('Policy has not yet been deployed.');
    // } else if (typeof this.policy == 'undefined') {
    //   throw new Error('Policy has not yet been built.');
    // } else {
    //   this.decrypter = new tDecDecrypter(
    //     this.cohort.porterUri,
    //     this.policy.policyKey,
    //     this.policy.encryptedTreasureMap,
    //     this.alice.verifyingKey,
    //     this.bobSecretKey,
    //     this.bobSecretKey
    //   );
  }
}
