import { SecretKey } from '@nucypher/nucypher-core';
import { ethers } from 'ethers';

import { Alice } from '../characters/alice';

import { Cohort } from './cohort';

export class Strategy {
  constructor(cohort: Cohort, startDate: Date, endDate: Date, alice: Alice) {
    throw new Error('Method not implemented.');
  }

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
    if (typeof aliceSecretKey == 'undefined') {
      aliceSecretKey = SecretKey.random();
    }

    const configuration = { porterUri };
    const alice = Alice.fromSecretKey(configuration, aliceSecretKey, provider);

    return new Strategy(cohort, startDate, endDate, alice);
  }

  public static fromJson() {
    throw new Error('Method not implemented.');
  }

  public static toJson() {
    throw new Error('Method not implemented.');
  }

  public static deploy() {
    throw new Error('Method not implemented.');
  }

  public static update() {
    throw new Error('Method not implemented.');
  }

  public static revoke() {
    throw new Error('Method not implemented.');
  }

  public static attachConditions() {
    throw new Error('Method not implemented.');
  }

  public get encrypter(): any {
    return this.encrypter;
  }

  public get decrypter(): any {
    return this.decrypter;
  }
}
